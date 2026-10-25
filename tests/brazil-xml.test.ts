/** XML algorithm and entrypoint-boundary tests; never model/runtime qualification. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { BRAZIL_XML_RUNTIME } from "../src/lib/runtime/brazil-xml.ts";
const python = process.env.XML_TEST_PYTHON ?? "python3";
const script = resolve("scripts/parse-nfe.py");
const invoice = (id = "InvoiceIndependent7", amount = "19.99") =>
  `<nfeProc xmlns="urn:nfe-test"><NFe><infNFe Id="${id}"><total><ICMSTot><vNF>${amount}</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;
function pure(text: string) {
  return spawnSync(
    python,
    [
      "-I",
      "-c",
      `import json,runpy,sys\nm=runpy.run_path(sys.argv[1])\ntry:\n print(json.dumps(m['evaluate'](json.load(sys.stdin)['text'])))\nexcept Exception as e:\n print(type(e).__name__,file=sys.stderr)\n sys.exit(2)`,
      script,
    ],
    { input: JSON.stringify({ text }), encoding: "utf8", timeout: 5000, maxBuffer: 2000000 },
  );
}
test("actual isolated Python parser preserves namespace identities, decimals and embedded XML boundaries", () => {
  const text = `Exportação: ${invoice()} narrative ${invoice("InvoiceOther8", "0.01")} end.`;
  const r = pure(text);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(
    out.invoices.map((i: { id: string; amount_minor: string }) => [i.id, i.amount_minor]),
    [
      ["InvoiceIndependent7", "1999"],
      ["InvoiceOther8", "1"],
    ],
  );
  assert.equal(out.invoices[0].xml_quote, invoice());
  assert.equal(out.fiscal_authorization_verified, false);
  assert.ok(
    out.invoices.every(
      (i: { fiscal_authorization_verified: boolean }) => i.fiscal_authorization_verified === false,
    ),
  );
});
test("DTD, internal/external entities, malformed XML and unsupported precision fail without echoing source", () => {
  const cases = [
    '<!DOCTYPE nfeProc [<!ENTITY x "CANARY_PRIVATE_VALUE">]>' + invoice().replace("19.99", "&x;"),
    '<!DOCTYPE nfeProc SYSTEM "file:///private/canary">' + invoice(),
    '<!DOCTYPE nfeProc SYSTEM "https://example.invalid/external.dtd">' + invoice(),
    '<!ENTITY x "CANARY_PRIVATE_VALUE">' + invoice(),
    invoice().slice(0, -10),
    invoice().replace("</vNF>", "</vNF><vNF>8.00</vNF>"),
    invoice().replace("</nfeProc>", "<x/>".repeat(10001) + "</nfeProc>"),
    invoice("Broken9", "1.001"),
    invoice("Broken9", "NaN"),
    invoice("Broken9", "-1.00"),
    "<nfeProc>" + "<x>".repeat(65) + "</x>".repeat(65) + "</nfeProc>",
    "x".repeat(200001),
    invoice() + "\u0000",
  ];
  for (const text of cases) {
    const r = pure(text);
    assert.equal(r.status, 2, `Unsafe XML accepted: ${text.slice(0, 70)}`);
    assert.equal(r.stdout, "");
    assert.ok(!r.stderr.includes("CANARY_PRIVATE_VALUE"));
  }
});
test("actual XML CLI rejects a host outside its exact declared runtime before publishing any receipt", () => {
  const metadata = spawnSync(
    python,
    [
      "-I",
      "-c",
      'import json,platform,pyexpat;print(json.dumps({"python":platform.python_version(),"architecture":platform.machine(),"expat":pyexpat.EXPAT_VERSION}))',
    ],
    { encoding: "utf8", timeout: 5000 },
  );
  assert.equal(metadata.status, 0, metadata.stderr);
  const actual = JSON.parse(metadata.stdout),
    matches = JSON.stringify(actual) === JSON.stringify(BRAZIL_XML_RUNTIME);
  const r = spawnSync(python, ["-I", script], {
    input: JSON.stringify({ text: invoice() }),
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(r.status, matches ? 0 : 2, r.stderr);
  if (!matches) {
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /invalid_xml_source/);
  } else {
    assert.deepEqual(JSON.parse(r.stdout).runtime, BRAZIL_XML_RUNTIME);
  }
});
