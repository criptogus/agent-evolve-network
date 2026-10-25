/** Isolated, bounded local XML transport; no provider or model calls. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateBrazilXmlReceipt, type BrazilXmlReceipt } from "./brazil-xml.ts";
export function parseBrazilXml(text: string, python: string): BrazilXmlReceipt {
  if (!python.startsWith("/") || !text.trim() || Buffer.byteLength(text) > 200000)
    throw new Error("Explicit XML Python and bounded source required");
  const result = spawnSync(
    python,
    ["-I", fileURLToPath(new URL("../../../scripts/parse-nfe.py", import.meta.url))],
    { input: JSON.stringify({ text }), encoding: "utf8", timeout: 5000, maxBuffer: 2000000 },
  );
  if (result.status !== 0 || result.error || result.signal)
    throw new Error("Pinned XML parser rejected source or runtime");
  return validateBrazilXmlReceipt(text, result.stdout);
}
