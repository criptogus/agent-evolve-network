import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { inspectContent } from "@/lib/security/prompt-injection-guard";

const Input = z.object({
  package_slug: z.string().regex(/^[a-z0-9-]{2,64}$/),
  prompt: z.string().min(4).max(8000),
});

function newToken(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * Public shareable run. Anyone (no login) can submit a prompt + skill slug;
 * we render the output behind a watermark and persist a row so the result
 * URL is shareable. Heavily rate-limited and sanitized — the inputs are
 * untrusted in every sense.
 */
export const createSharedRun = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    // Prompt-injection guard against the user input itself (we feed it to an LLM).
    const guard = inspectContent(data.prompt, { rejectAtOrAbove: "critical", fence: true });
    if (guard.rejected) {
      return { ok: false as const, reason: guard.reason ?? "blocked" };
    }

    const { data: pkg, error } = await supabaseAdmin
      .from("packages")
      .select("id,slug,name,is_published,latest_version")
      .eq("slug", data.package_slug)
      .maybeSingle();
    if (error || !pkg) return { ok: false as const, reason: "package_not_found" };
    if (!pkg.is_published) return { ok: false as const, reason: "package_not_published" };

    // Per-package + per-IP rate limiting is enforced upstream by the API layer.
    // The output renderer is delegated to the SkillForge pipeline; for the
    // shareable surface we stub a clearly-labeled placeholder so the
    // database write path is exercised even without an LLM call configured.
    const t0 = Date.now();
    const output =
      `(super-agent-skill shared run — output preview)\n\n` +
      `Skill: ${pkg.name}\n` +
      `Prompt:\n${guard.sanitized_content.slice(0, 1200)}\n\n` +
      `Sign in to run this skill against your data with full output.`;

    const { data: row, error: insErr } = await supabaseAdmin
      .from("shared_runs")
      .insert({
        share_token: newToken(),
        package_id: pkg.id,
        package_slug: pkg.slug,
        package_version: pkg.latest_version,
        prompt: data.prompt.slice(0, 4000),
        output,
        duration_ms: Date.now() - t0,
        redacted: true,
      })
      .select("share_token")
      .single();
    if (insErr || !row) return { ok: false as const, reason: "insert_failed" };

    return { ok: true as const, share_token: row.share_token };
  });
