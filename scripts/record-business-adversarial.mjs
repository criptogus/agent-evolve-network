/** Prepare immutable evidence insertion; never grants publication or changes approval criteria. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { eligibleForPublication, assertCompleteBusinessPlan } from "./adversarial-approval.mjs";
const [dir, out] = process.argv.slice(2);
if (!dir || !out || process.argv.length !== 4 || existsSync(out))
  throw new Error("Required: evidence directory and a NEW SQL output path");
const read = (name) => JSON.parse(readFileSync(`${dir}/${name}`, "utf8"));
const report = read("report.json"),
  registry = read("registry.json"),
  plan = read("plan.json");
assertCompleteBusinessPlan(plan);
const digest = createHash("sha256")
  .update(readFileSync(`${dir}/plan.json`))
  .digest("hex");
if (
  report.plan_sha256 !== digest ||
  report.skills !== 21 ||
  registry.length !== 21 ||
  report.reports.length !== 21
)
  throw new Error("Incomplete or changed evidence");
const records = report.reports.map((r) => {
  const meta = registry.find((m) => m.slug === r.slug),
    subject = plan.subjects.find((s) => s.slug === r.slug);
  if (
    !meta ||
    !subject ||
    meta.prompt_sha256 !== r.prompt_sha256 ||
    meta.latest_version !== r.version ||
    r.model !== plan.model ||
    eligibleForPublication(r, subject.cases.length) !== r.eligible
  )
    throw new Error(`Version, evidence or eligibility mismatch: ${r.slug}`);
  return { ...r, ...meta, id: randomUUID(), plan_sha256: digest };
});
const json = JSON.stringify(records).replaceAll("'", "''");
const sql = `begin;
create temp table evaluation_import(payload jsonb) on commit drop;
insert into evaluation_import values ('${json}'::jsonb);
do $record$
declare item jsonb; current_prompt text; current_archive text; current_version uuid; current_package uuid;
begin
 for item in select value from evaluation_import, jsonb_array_elements(payload) loop
  select p.id,v.id,encode(extensions.digest(v.system_prompt,'sha256'),'hex'),a.sha256 into current_package,current_version,current_prompt,current_archive from public.packages p join public.package_versions v on v.package_id=p.id and v.version=p.latest_version join public.package_artifacts a on a.version_id=v.id where p.slug=item->>'slug' and p.latest_version=item->>'version' for update of p;
  if current_version is distinct from (item->>'version_id')::uuid or current_package is distinct from (item->>'package_id')::uuid or current_prompt is distinct from item->>'prompt_sha256' or current_archive is distinct from item->>'archive_sha256' then raise exception 'IMMUTABLE_SOURCE_CHANGED: %',item->>'slug'; end if;
  if (item->>'total')::int<>jsonb_array_length(item->'outcomes') or (item->>'total')::int<=0 then raise exception 'EMPTY_OR_PARTIAL_REPORT'; end if;
  insert into public.adversarial_runs(id,package_id,version_id,trigger_kind,total,passed,failed,pass_rate,severity_weighted_score,by_category,by_severity,outcomes,duration_ms,model,judge_model,judge_cases,subject_arm)
  values((item->>'id')::uuid,current_package,current_version,'manual',(item->>'total')::int,(item->>'passed')::int,(item->>'failed')::int,(item->>'pass_rate')::numeric,(item->>'severity_weighted_score')::numeric,item->'by_category',item->'by_severity',(select jsonb_agg(o.value || jsonb_build_object('provenance',jsonb_build_object('plan_sha256',item->>'plan_sha256','prompt_sha256',item->>'prompt_sha256','archive_sha256',item->>'archive_sha256','prompt_protocol',item->>'prompt_protocol','scope','text-only declared local model/runtime evaluation; no live tool execution','eligible',item->'eligible','advisory_model',item->>'advisory_model'))) from jsonb_array_elements(item->'outcomes') o),(item->>'duration_ms')::int,item->>'model',item->>'judge_model',(item->>'primary_reviewed')::int,'certified');
 end loop;
end $record$;
select count(*) as recorded_runs,count(*) filter(where r.pass_rate>=.9 and r.severity_weighted_score>=.9 and not exists(select 1 from jsonb_each(r.by_severity) sev where sev.key in ('high','critical') and (sev.value->>'passed')::int<(sev.value->>'total')::int)) as threshold_qualifiers from public.adversarial_runs r join (select value->>'id' as id from evaluation_import,jsonb_array_elements(payload)) batch on batch.id=r.id::text;
commit;
`;
writeFileSync(out, sql, { flag: "wx", mode: 0o600 });
writeFileSync(
  `${dir}/import-manifest.json`,
  JSON.stringify(
    {
      records: records.map((r) => ({
        id: r.id,
        slug: r.slug,
        version_id: r.version_id,
        eligible: r.eligible,
      })),
      sql_sha256: createHash("sha256").update(sql).digest("hex"),
    },
    null,
    2,
  ),
  { flag: "wx", mode: 0o600 },
);
console.log(
  `Prepared ${records.length} real evidence records; ${records.filter((r) => r.eligible).length} eligible for the existing administrator approval workflow. No packages were published.`,
);
