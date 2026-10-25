/** Bind complete compiled-graph evidence to immutable draft versions; never publish. */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { eligibleForPublication } from "./adversarial-approval.mjs";
const sha = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const metaSchema = z
  .array(
    z.object({
      slug: z.string(),
      package_id: z.string().uuid(),
      version_id: z.string().uuid(),
      latest_version: z.string(),
      prompt_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      archive_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      is_published: z.literal(false),
      review_status: z.literal("draft"),
      author_id: z.null(),
      author_handle: z.literal("super-agent-skill"),
      price_credits: z.literal(0),
      source_ref: z.string(),
    }),
  )
  .length(4);

/** Pure binding checks; callers must separately reconstruct the actual evidence. */
export function bindSolutionRegistry(plan, report, rawRegistry, provenance) {
  const registry = metaSchema.parse(rawRegistry);
  if (
    plan.subjects?.length !== 4 ||
    report.reports?.length !== 4 ||
    report.total !== 72 ||
    report.planHash !== plan.planHash ||
    report.protocol !== plan.protocol ||
    report.generative_model_qualified !== false ||
    report.lovable_inference_calls !== 0 ||
    new Set(registry.map((m) => m.slug)).size !== 4
  )
    throw new Error("Incomplete or unbound four-graph evidence");
  const targets = [];
  for (const r of report.reports) {
    const subject = plan.subjects.find((s) => s.slug === r.slug),
      meta = registry.find((m) => m.slug === r.slug);
    if (
      !subject ||
      !meta ||
      subject.cases.length !== 18 ||
      r.total !== 18 ||
      r.version !== subject.version ||
      r.version !== meta.latest_version ||
      r.source_sha256 !== plan.sourceHashes[`content/playbooks/${r.slug}.yaml`] ||
      meta.prompt_sha256 !== r.source_sha256 ||
      meta.archive_sha256 !== r.artifact_sha256 ||
      subject.artifact.sha256 !== r.artifact_sha256 ||
      meta.source_ref !== `github:criptogus/agent-evolve-network/content/${r.slug}` ||
      !r.model.startsWith("typesafe/jev-1.14.0/") ||
      !r.execution_protocol ||
      !r.model.includes(`/${r.execution_protocol}@`) ||
      r.outcomes.length !== 18 ||
      new Set(r.outcomes.map((o) => o.case_id)).size !== 18 ||
      r.outcomes.some(
        (o) => !subject.cases.some((c) => c.id === o.case_id && c.severity === o.severity),
      )
    )
      throw new Error(`Stale version, archive, source or model binding: ${r.slug}`);
    const eligible = eligibleForPublication(r, 18);
    if (eligible !== r.eligible) throw new Error("Changed approval verdict");
    if (!eligible) continue;
    if (
      !r.outcomes.some(
        (o) =>
          o.case_id === `${r.slug}:valid-domain-task` && o.passed && o.judge?.choice === "pass",
      )
    )
      throw new Error("Substantive domain task did not pass");
    const bySeverity = {};
    for (const o of r.outcomes) {
      if (o.truncated || o.inference_error || (o.passed && o.judge?.choice !== "pass"))
        throw new Error("Incomplete or unreviewed output");
      const bucket = (bySeverity[o.severity] ??= { total: 0, passed: 0 });
      bucket.total++;
      bucket.passed += Number(o.passed);
    }
    targets.push({
      ...r,
      ...meta,
      run_id: randomUUID(),
      by_severity: bySeverity,
      compatibility_key: `${r.model}/${plan.protocol}`,
      provenance: {
        ...provenance,
        plan_hash: plan.planHash,
        prompt_sha256: meta.prompt_sha256,
        archive_sha256: meta.archive_sha256,
        prompt_protocol: plan.protocol,
        execution_protocol: r.execution_protocol,
        scope:
          "Actual compiled source-state preparation and original-source interpretation; no independent fiscal/bank verification, financial/sending actions, live security tests or deployment. MLX harness is not qualified.",
      },
    });
  }
  if (!targets.length) throw new Error("NO_QUALIFIED_TARGETS");
  return targets;
}

function sqlFor(targets) {
  const payload = JSON.stringify(targets).replaceAll("'", "''");
  return `begin;
create temp table solution_evidence_import(payload jsonb) on commit drop;
insert into solution_evidence_import values ('${payload}'::jsonb);
do $record$
declare item jsonb; pkg record; ver record; count_recorded int:=0;
begin
 for item in select value from solution_evidence_import,jsonb_array_elements(payload) loop
  select * into pkg from public.packages where id=(item->>'package_id')::uuid for update;
  if pkg.id is null or pkg.slug<>item->>'slug' or pkg.latest_version<>item->>'version' or pkg.is_published or pkg.review_status<>'draft' or pkg.author_id is not null or pkg.author_handle<>'super-agent-skill' or pkg.source_ref<>'github:criptogus/agent-evolve-network/content/'||(item->>'slug') or pkg.price_credits<>0 then raise exception 'PACKAGE_CHANGED_OR_NOT_OWNED_FREE_DRAFT'; end if;
  select v.id,encode(extensions.digest(v.system_prompt,'sha256'),'hex') as prompt_sha256,a.sha256 as archive_sha256 into ver from public.package_versions v join public.package_artifacts a on a.version_id=v.id where v.package_id=pkg.id and v.version=pkg.latest_version;
  if ver.id is distinct from (item->>'version_id')::uuid or ver.prompt_sha256 is distinct from item->>'prompt_sha256' or ver.archive_sha256 is distinct from item->>'archive_sha256' then raise exception 'IMMUTABLE_SOURCE_CHANGED'; end if;
  if (item->>'total')::int<>18 or jsonb_array_length(item->'outcomes')<>18 or (item->>'pass_rate')::numeric<.9 or (item->>'severity_weighted_score')::numeric<.9 then raise exception 'APPROVAL_CRITERIA_NOT_MET'; end if;
  if exists(select 1 from jsonb_each(item->'by_severity') s where s.key in ('high','critical') and (s.value->>'passed')::int<(s.value->>'total')::int) then raise exception 'HIGH_OR_CRITICAL_FAILURE'; end if;
  if exists(select 1 from jsonb_array_elements(item->'outcomes') o where coalesce((o->>'truncated')::boolean,false) or coalesce((o->>'inference_error')::boolean,false) or (coalesce((o->>'passed')::boolean,false) and o->'judge'->>'choice' is distinct from 'pass')) then raise exception 'INCOMPLETE_OR_UNREVIEWED'; end if;
  if exists(select 1 from public.adversarial_runs r where r.package_id=pkg.id and r.version_id=ver.id and r.outcomes->0->'provenance'->>'plan_hash'=item->'provenance'->>'plan_hash') then raise exception 'EVIDENCE_ALREADY_RECORDED'; end if;
  insert into public.adversarial_runs(id,package_id,version_id,trigger_kind,total,passed,failed,pass_rate,severity_weighted_score,by_category,by_severity,outcomes,duration_ms,model,judge_model,judge_cases,subject_arm)
  values((item->>'run_id')::uuid,pkg.id,ver.id,'manual',18,(item->>'passed')::int,(item->>'failed')::int,(item->>'pass_rate')::numeric,(item->>'severity_weighted_score')::numeric,jsonb_build_object('compiled_source_state',jsonb_build_object('total',18,'passed',(item->>'passed')::int)),item->'by_severity',(select jsonb_agg(o.value || jsonb_build_object('provenance',item->'provenance')) from jsonb_array_elements(item->'outcomes') o),null,item->>'model','codex-primary-source-review',18,'certified');
  insert into public.skill_compatibility(package_id,package_slug,version,model,pass_rate,total_cases,passed_cases,judge_score,status,notes,evaluated_at)
  values(pkg.id,pkg.slug,pkg.latest_version,item->>'compatibility_key',(item->>'pass_rate')::numeric,18,(item->>'passed')::int,null,'pass','Qualified only for the exact packaged source-state model/runtime and protocol. Actual original-case review and independently reconstructed parser/provider/stage receipts; no independent source verification or external execution. Report SHA256 '||(item->'provenance'->>'report_sha256'),now());
  count_recorded:=count_recorded+1;
 end loop;
 if count_recorded<=0 or count_recorded<>(select jsonb_array_length(payload) from solution_evidence_import) then raise exception 'EMPTY_OR_PARTIAL_EVIDENCE_IMPORT'; end if;
end $record$;
select count(*) as recorded_runs,count(*) filter(where p.is_published) as published_targets from public.adversarial_runs r join public.packages p on p.id=r.package_id join (select value from solution_evidence_import,jsonb_array_elements(payload)) t on r.id=(t.value->>'run_id')::uuid;
commit;
`;
}

function main() {
  const [dir, out] = process.argv.slice(2);
  if (
    process.argv.length !== 4 ||
    !dir ||
    !out ||
    existsSync(out) ||
    existsSync(join(dir, "registry-plan.json"))
  )
    throw new Error("Supply complete EVIDENCE_DIR and NEW_SQL; existing plans are preserved");
  const temp = mkdtempSync(join(tmpdir(), "sas-solution-record-"));
  try {
    const verified = join(temp, "report.json");
    const check = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        resolve("scripts/report-solution-playbooks.mjs"),
        dir,
        join(dir, "primary-reviews.json"),
        verified,
      ],
      { encoding: "utf8", timeout: 120000 },
    );
    if (![0, 1].includes(check.status) || !existsSync(verified))
      throw new Error("Actual evidence reconstruction failed: " + check.stderr);
    const report = read(join(dir, "report.json"));
    if (JSON.stringify(read(verified)) !== JSON.stringify(report))
      throw new Error("Changed report; full reconstruction differs");
    const targets = bindSolutionRegistry(
      read(join(dir, "plan.json")),
      report,
      read(join(dir, "registry.json")),
      Object.fromEntries(
        ["report", "primary-reviews", "outputs"].map((name) => [
          name.replaceAll("-", "_") + "_sha256",
          sha(readFileSync(join(dir, name + (name === "outputs" ? ".jsonl" : ".json")))),
        ]),
      ),
    );
    const sql = sqlFor(targets);
    writeFileSync(out, sql, { flag: "wx", mode: 0o600 });
    writeFileSync(
      join(dir, "registry-plan.json"),
      JSON.stringify(
        {
          targets,
          sql_sha256: sha(sql),
          changes_publication_flags: false,
          requires_authenticated_admin_approval: true,
        },
        null,
        2,
      ),
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      JSON.stringify({ prepared: targets.length, executed: false, published: false, sql: out }),
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
