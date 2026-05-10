import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getGatewayModel } from "@/lib/ai-gateway";
import { PackageDraftSchema } from "@/lib/skills/schemas";
import { requireAdmin } from "./middleware";
import { webResearch } from "./research.server";

const META_SYSTEM = `You are SkillForge Author, a proprietary meta-agent that designs production-grade agent packages.
You output strict JSON conforming to the PackageDraft schema. Every package must be:
- Executable: system_prompt is a complete operational instruction set with reasoning steps and output format.
- Verifiable: rules.input_schema/output_schema use JSON-schema-like fields; must/must_not are testable invariants.
- Realistic: at least 2 examples covering happy path and edge case.
- Domain-specific: reflect the brief's vertical, tools, and constraints. No filler.

Type semantics: skill = capability; playbook = multi-step decision flow; soul = personality/values layer; guardrail = safety boundary.
Slug must be lowercase-kebab.`;

async function generateDraft(brief: string, type: string, vertical?: string, grounding?: string) {
  const model = getGatewayModel("google/gemini-3-flash-preview");
  const prompt = `Brief:\n${brief}\n\nType: ${type}${vertical ? `\nVertical: ${vertical}` : ""}${
    grounding ? `\n\nGrounding research (use as ground truth):\n${grounding.slice(0, 8000)}` : ""
  }\n\nDesign a complete, production-ready ${type} package. Return ONLY the JSON.`;

  const { experimental_output } = await generateText({
    model,
    system: META_SYSTEM,
    prompt,
    experimental_output: Output.object({ schema: PackageDraftSchema }),
  });
  return experimental_output;
}

async function insertDraftPackage(
  supabase: any,
  userId: string,
  draft: any,
  meta: { source_kind: "github" | "markdown" | "request"; source_ref: string; publish?: boolean }
) {
  // ensure unique slug
  const baseSlug = draft.slug;
  let slug = baseSlug;
  let n = 1;
  while (true) {
    const { data: existing } = await supabase
      .from("packages")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    n += 1;
    slug = `${baseSlug}-${n}`;
    if (n > 50) break;
  }

  const { data: pkg, error: pkgErr } = await supabase
    .from("packages")
    .insert({
      slug,
      name: draft.name,
      type: draft.type,
      description: draft.description,
      long_description: draft.long_description,
      author_id: userId,
      author_handle: "@admin",
      author_verified: true,
      is_published: !!meta.publish,
      latest_version: "0.1.0",
      scopes: draft.scopes,
      source_kind: meta.source_kind,
      source_ref: meta.source_ref,
    })
    .select()
    .single();
  if (pkgErr) throw new Response(`Insert package failed: ${pkgErr.message}`, { status: 500 });

  const { error: verErr } = await supabase.from("package_versions").insert({
    package_id: pkg.id,
    version: "0.1.0",
    status: meta.publish ? "stable" : "beta",
    notes: `Imported from ${meta.source_kind}: ${meta.source_ref}`,
    system_prompt: draft.system_prompt,
    rules: draft.rules,
    examples: draft.examples,
    compatibility: draft.compatibility,
  });
  if (verErr) throw new Response(`Insert version failed: ${verErr.message}`, { status: 500 });

  return pkg;
}

// ---------- GitHub importer ----------

const GithubInput = z.object({
  repoUrl: z
    .string()
    .url()
    .refine((u) => /github\.com\//.test(u), "Must be a github.com URL"),
  maxFiles: z.number().int().min(1).max(15).default(8),
});

export const importFromGithub = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => GithubInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const m = data.repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!m) throw new Response("Invalid GitHub URL", { status: 400 });
    const [, owner, repoRaw] = m;
    const repo = repoRaw.replace(/\.git$/, "");

    const { data: importRow } = await supabase
      .from("package_imports")
      .insert({
        source_kind: "github",
        source_ref: `${owner}/${repo}`,
        status: "analysing",
        created_by: userId,
        raw_input: data.repoUrl,
      })
      .select()
      .single();

    try {
      const apiHeaders: Record<string, string> = { Accept: "application/vnd.github+json" };
      if (process.env.GITHUB_TOKEN) apiHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

      // Resolve default branch
      const repoMeta = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: apiHeaders });
      if (!repoMeta.ok) throw new Error(`GitHub repo fetch failed: ${repoMeta.status}`);
      const repoJson = await repoMeta.json();
      const branch = repoJson.default_branch || "main";

      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers: apiHeaders }
      );
      if (!treeRes.ok) throw new Error(`GitHub tree fetch failed: ${treeRes.status}`);
      const tree = await treeRes.json();

      const candidates = (tree.tree ?? [])
        .filter((n: any) => n.type === "blob" && typeof n.path === "string")
        .filter((n: any) => {
          const p = n.path.toLowerCase();
          return (
            p.endsWith(".md") ||
            /(skills|playbooks|prompts|guardrails|souls)\//.test(p) ||
            /\.prompt\.(md|txt|json)$/.test(p)
          );
        })
        .filter((n: any) => n.size && n.size < 60_000)
        .slice(0, data.maxFiles);

      const staged: Array<{ path: string; pkgId?: string; error?: string }> = [];
      for (const c of candidates) {
        try {
          const raw = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${c.path}`
          );
          if (!raw.ok) throw new Error(`raw fetch ${raw.status}`);
          const content = await raw.text();
          const inferredType = inferType(c.path, content);
          const brief = `Source repo: ${owner}/${repo}\nFile: ${c.path}\n\nContent:\n${content.slice(0, 6000)}\n\nGoal: extract the core capability from this file and refine it into a production-grade ${inferredType} using SkillForge proprietary standards.`;
          const draft = await generateDraft(brief, inferredType);
          const pkg = await insertDraftPackage(supabase, userId, draft, {
            source_kind: "github",
            source_ref: `${owner}/${repo}/${c.path}`,
          });
          staged.push({ path: c.path, pkgId: pkg.id });
        } catch (e: any) {
          staged.push({ path: c.path, error: e?.message ?? "failed" });
        }
      }

      await supabase
        .from("package_imports")
        .update({ status: "drafted", notes: JSON.stringify({ staged }) })
        .eq("id", importRow.id);

      return { importId: importRow.id, staged };
    } catch (e: any) {
      await supabase
        .from("package_imports")
        .update({ status: "failed", notes: e?.message ?? "failed" })
        .eq("id", importRow.id);
      throw new Response(e?.message ?? "Import failed", { status: 500 });
    }
  });

function inferType(path: string, content: string): "skill" | "playbook" | "soul" | "guardrail" {
  const p = path.toLowerCase();
  const c = content.slice(0, 1000).toLowerCase();
  if (p.includes("guardrail") || c.includes("guardrail") || c.includes("policy")) return "guardrail";
  if (p.includes("playbook") || c.includes("step 1") || c.includes("workflow")) return "playbook";
  if (p.includes("soul") || c.includes("persona") || c.includes("tone of voice")) return "soul";
  return "skill";
}

// ---------- Markdown importer ----------

const MarkdownInput = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        content: z.string().min(20).max(120_000),
      })
    )
    .min(1)
    .max(10),
});

export const importMarkdown = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => MarkdownInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const staged: Array<{ name: string; pkgId?: string; error?: string }> = [];

    for (const f of data.files) {
      const { data: importRow } = await supabase
        .from("package_imports")
        .insert({
          source_kind: "markdown",
          source_ref: f.name,
          status: "analysing",
          created_by: userId,
          raw_input: f.content.slice(0, 8000),
        })
        .select()
        .single();
      try {
        const inferred = inferType(f.name, f.content);
        const brief = `File: ${f.name}\n\nContent:\n${f.content.slice(0, 8000)}\n\nGoal: parse, normalise and refine into a production-grade ${inferred} using SkillForge proprietary standards. Categorise by industry/technology where evident.`;
        const draft = await generateDraft(brief, inferred);
        const pkg = await insertDraftPackage(supabase, userId, draft, {
          source_kind: "markdown",
          source_ref: f.name,
        });
        await supabase
          .from("package_imports")
          .update({ status: "drafted", generated_package_id: pkg.id })
          .eq("id", importRow.id);
        staged.push({ name: f.name, pkgId: pkg.id });
      } catch (e: any) {
        await supabase
          .from("package_imports")
          .update({ status: "failed", notes: e?.message })
          .eq("id", importRow.id);
        staged.push({ name: f.name, error: e?.message ?? "failed" });
      }
    }

    return { staged };
  });

// re-export helpers for requests fn
export { generateDraft, insertDraftPackage, webResearch };
