#!/usr/bin/env node
/** Build a reviewed, explicit, atomic import for the native database integration.
 * No models, publication, trust scores, destructive updates or implicit full-catalog sync.
 * npm run sync:content -- --slugs a,b --sql-output /tmp/import.sql
 * Execute the resulting SQL through the native database tool after reviewing its report.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { BUSINESS_ARTIFACT_FILES } from "./business-artifact-files.mjs";
import { buildSkillPluginManifest } from "../src/lib/plugins/agent-plugins.ts";
import { runPluginConformance } from "../src/lib/plugins/conformance.ts";
import { ArtifactFilesSchema, artifactDigest } from "../src/lib/plugins/artifacts.ts";
const rawArgs = process.argv.slice(2);
const newVersion = rawArgs.includes("--new-version");
const args = rawArgs.filter((arg) => arg !== "--new-version");
if (args.length !== 4 || args[0] !== "--slugs" || args[2] !== "--sql-output")
  throw new Error("Required: --slugs slug,slug --sql-output /absolute/path.sql");
const slugs = args[1].split(",");
if (
  !slugs.length ||
  new Set(slugs).size !== slugs.length ||
  slugs.some(
    (s) =>
      !z
        .string()
        .regex(/^[a-z0-9-]{2,64}$/)
        .safeParse(s).success,
  )
)
  throw new Error("Select a nonempty, unique slug batch");
const schema = z.object({
  slug: z.string(),
  name: z.string(),
  type: z.enum(["skill", "playbook", "soul", "guardrail"]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(20),
  license: z.string().min(1),
  authors: z.array(z.string()).min(1),
  system_prompt: z.string().optional(),
  long_description: z.string().optional(),
  rules: z.record(z.unknown()).optional(),
  examples: z.array(z.unknown()).optional(),
  compatibility: z.array(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  scopes: z.array(z.string()).optional(),
});
const businessSlugs = new Set(
  z
    .array(z.object({ slug: z.string() }))
    .parse(JSON.parse(readFileSync("content/expansion/skills.json", "utf8")))
    .map((skill) => skill.slug),
);
const packages = [];
for (const slug of slugs) {
  let source: string | undefined;
  for (const folder of ["skills", "playbooks", "souls", "guardrails"]) {
    const path = `content/${folder}/${slug}.yaml`;
    try {
      const body = readFileSync(path, "utf8");
      if (source) throw new Error("Ambiguous source");
      source = body;
    } catch (e) {
      if (!(e instanceof Error && "code" in e && e.code === "ENOENT")) throw e;
    }
  }
  if (!source) throw new Error(`Missing source: ${slug}`);
  const p = schema.parse(parse(source));
  if (p.slug !== slug) throw new Error("Slug/source mismatch");
  const manifest = buildSkillPluginManifest({
    slug,
    name: p.name,
    description: p.description,
    version: p.version,
    license: p.license,
    authorHandle: "super-agent-skill",
    tags: p.tags ?? [],
  });
  const files: Record<string, string> = { "plugin.json": JSON.stringify(manifest, null, 2) };
  if (p.type === "skill") {
    const walk = (dir: string, prefix: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name),
          relative = `${prefix}/${entry.name}`;
        if (entry.name === "__pycache__" || entry.name.endsWith(".pyc")) continue;
        if (entry.isDirectory()) walk(path, relative);
        else if (entry.isFile()) files[relative] = readFileSync(path, "utf8");
        else throw new Error("Source must contain only regular text files");
      }
    };
    if (businessSlugs.has(slug)) {
      for (const relative of BUSINESS_ARTIFACT_FILES)
        files[`skills/${slug}/${relative}`] = readFileSync(`skills/${slug}/${relative}`, "utf8");
    } else walk(`skills/${slug}`, `skills/${slug}`);
  } else
    files[`skills/${slug}/SKILL.md`] =
      `---\nname: ${slug}\ndescription: ${JSON.stringify(p.description)}\nlicense: ${p.license}\n---\n\n# ${p.name}\n\nFollow this source workflow in order. Preserve its inputs, source references and human approval gates. Candidate content; public adversarial evaluation remains pending.\n\n\`\`\`yaml\n${source}\n\`\`\`\n`;
  ArtifactFilesSchema.parse(files);
  const report = runPluginConformance(new Map(Object.entries(files)));
  if (!report.conformant)
    throw new Error(`${slug}: ${JSON.stringify(report.checks.filter((c) => c.status === "fail"))}`);
  packages.push({
    ...p,
    system_prompt: p.system_prompt ?? source,
    rules: p.rules ?? {},
    examples: p.examples ?? [],
    compatibility: p.compatibility ?? [],
    files,
    sha256: artifactDigest(files),
  });
}
const literal = (v: unknown) => `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
const sql = `begin;\ndo $import$\ndeclare item jsonb; pid uuid; vid uuid; inserted int:=0;\nbegin\n for item in select value from jsonb_array_elements(${literal(packages)}) loop\n if exists(select 1 from public.packages where slug=item->>'slug') then
 ${newVersion ? `select id into pid from public.packages where slug=item->>'slug' and not is_published and review_status='draft' and author_id is null and author_handle='super-agent-skill' and source_kind='github' and source_ref='github:criptogus/agent-evolve-network/content/'||(item->>'slug') for update; if pid is null then raise exception 'ONLY_OWNED_DRAFT_VERSION'; end if; if exists(select 1 from public.package_versions where package_id=pid and version=item->>'version') then raise exception 'IMMUTABLE_VERSION_EXISTS'; end if;` : `raise exception 'SLUG_COLLISION: %; no existing content is overwritten',item->>'slug';`}
 else\n insert into public.packages(slug,name,type,author_handle,author_verified,description,long_description,license,latest_version,scopes,tags,is_published,review_status,source_kind,source_ref,submitted_at) values(item->>'slug',item->>'name',(item->>'type')::public.package_type,'super-agent-skill',false,item->>'description',item->>'long_description',item->>'license',item->>'version',array(select jsonb_array_elements_text(coalesce(item->'scopes','[]'))),array(select jsonb_array_elements_text(coalesce(item->'tags','[]'))),false,'draft','github','github:criptogus/agent-evolve-network/content/'||(item->>'slug'),now()) returning id into pid;\n end if;\n insert into public.package_versions(package_id,version,system_prompt,rules,examples,compatibility) values(pid,item->>'version',item->>'system_prompt',item->'rules',item->'examples',item->'compatibility') returning id into vid;\n insert into public.package_artifacts(package_id,version_id,files,sha256,created_by) values(pid,vid,item->'files',item->>'sha256',null);\n update public.packages set latest_version=item->>'version',description=item->>'description',long_description=item->>'long_description',tags=array(select jsonb_array_elements_text(coalesce(item->'tags','[]'))),scopes=array(select jsonb_array_elements_text(coalesce(item->'scopes','[]'))) where id=pid;
 inserted:=inserted+1;\n end loop;\n if inserted=0 then raise exception 'EMPTY_IMPORT'; end if;\nend $import$;\nselect count(*) as imported, count(*) filter(where not is_published and review_status='draft') as draft_unpublished from public.packages where slug in (${slugs.map((s) => `'${s}'`).join(",")});\ncommit;\n`;
writeFileSync(args[3], sql);
mkdirSync("artifacts/validation", { recursive: true });
writeFileSync(
  "artifacts/validation/content-import.json",
  JSON.stringify(
    {
      mode: "sql-plan",
      packages: packages.length,
      slugs,
      publication: "draft",
      sql_output: args[3],
      files: packages.map((p) => ({
        slug: p.slug,
        count: Object.keys(p.files).length,
        sha256: p.sha256,
      })),
    },
    null,
    2,
  ),
);
console.log(
  `Prepared ${packages.length} draft packages; complete files validated; no database changes or model calls performed.`,
);
