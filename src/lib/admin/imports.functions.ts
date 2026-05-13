import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./middleware";
import { generateDraft, insertDraftPackage, inferType } from "./author.server";

// ---------- Wizard: author from a brief ----------

const WizardInput = z.object({
  type: z.enum(["skill", "playbook", "soul", "guardrail"]),
  industry: z.string().max(120).optional(),
  technology: z.string().max(120).optional(),
  business_area: z.string().max(120).optional(),
  brief: z.string().min(20).max(4000),
  publish: z.boolean().default(false),
});

export const wizardCreatePackage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => WizardInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
    const vertical = [data.industry, data.technology, data.business_area].filter(Boolean).join(" / ");
    const draft = await generateDraft(data.brief, data.type, vertical || undefined);
    const pkg = await insertDraftPackage(supabase, userId, draft, {
      source_kind: "wizard",
      source_ref: vertical || "wizard",
      publish: data.publish,
    });
    return { package: pkg, draft };
  });

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
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
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
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
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
