import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkEligibility } from "@/lib/growth/bounties";

const VERTICALS = ["security", "fintech", "healthcare", "devops", "general"] as const;

const PostInput = z.object({
  title: z.string().min(8).max(160),
  brief: z.string().min(40).max(4000),
  vertical: z.enum(VERTICALS),
  reward_cents: z.number().int().min(100).max(10_000_000),  // $1 - $100k
  currency: z.string().length(3).default("usd"),
  required_trust_score: z.number().min(0).max(1).default(0.85),
  required_adversarial_pass: z.number().min(0).max(1).default(0.80),
  deadline: z.string().datetime().optional(),
});

export const postBounty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PostInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase: _sb, userId } = context;
    const supabase = _sb as any;
    const { data: row, error } = await supabase
      .from("skill_bounties")
      .insert({
        posted_by: userId,
        title: data.title,
        brief: data.brief,
        vertical: data.vertical,
        reward_cents: data.reward_cents,
        currency: data.currency,
        required_trust_score: data.required_trust_score,
        required_adversarial_pass: data.required_adversarial_pass,
        deadline: data.deadline ?? null,
        status: "open",
      })
      .select("id")
      .single();
    if (error || !row) throw new Response(error?.message ?? "insert failed", { status: 500 });
    return { ok: true, id: row.id };
  });

const SubmitInput = z.object({
  bounty_id: z.string().uuid(),
  package_slug: z.string().min(2).max(120),
});

export const submitToBounty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase: _sb, userId } = context;
    const supabase = _sb as any;

    const { data: bounty } = await supabase
      .from("skill_bounties")
      .select("id,status,vertical,required_trust_score,required_adversarial_pass,deadline,reward_cents")
      .eq("id", data.bounty_id)
      .maybeSingle();
    if (!bounty) throw new Response("bounty not found", { status: 404 });

    const { data: pkg } = await supabase
      .from("packages").select("id,tags").eq("slug", data.package_slug).maybeSingle();
    if (!pkg) throw new Response("package not found", { status: 404 });

    const { data: trust } = await supabase
      .from("package_trust_scores")
      .select("score,adversarial_pass_rate")
      .eq("package_id", pkg.id)
      .maybeSingle();

    const reason = checkEligibility(
      {
        status: bounty.status as "open",
        required_trust_score: Number(bounty.required_trust_score),
        required_adversarial_pass: Number(bounty.required_adversarial_pass),
        vertical: bounty.vertical,
        deadline: bounty.deadline,
      },
      {
        trust_score: trust?.score === undefined ? null : Number(trust.score),
        adversarial_pass_rate: trust?.adversarial_pass_rate === undefined ? null : Number(trust.adversarial_pass_rate),
        package_tags: (pkg.tags as string[]) ?? [],
      },
    );

    if (reason !== "OK") {
      return { ok: false, reason };
    }

    const { error: insErr } = await supabase
      .from("bounty_submissions")
      .insert({
        bounty_id: bounty.id,
        submitted_by: userId,
        package_id: pkg.id,
        trust_score_at_submission: trust?.score ?? null,
        adversarial_score_at_submission: trust?.adversarial_pass_rate ?? null,
        status: "accepted",
      });
    if (insErr) {
      if (insErr.code === "23505") return { ok: false, reason: "ALREADY_SUBMITTED" };
      throw new Response(insErr.message, { status: 500 });
    }

    // Auto-claim: mark bounty as claimed by this submission.
    await supabase
      .from("skill_bounties")
      .update({ status: "claimed", winning_package_id: pkg.id, winner_user_id: userId, updated_at: new Date().toISOString() })
      .eq("id", bounty.id)
      .eq("status", "open");  // best-effort optimistic claim

    return { ok: true, reason: "ACCEPTED" };
  });
