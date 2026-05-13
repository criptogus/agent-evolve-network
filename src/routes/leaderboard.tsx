import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { EmptyState } from "@/components/site/EmptyState";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { rankLeaderboard } from "@/lib/growth/bounties";

type Row = { referrer_user_id: string; activated_referrals: number; referral_earnings_cents: number; handle?: string | null };

export const Route = createFileRoute("/leaderboard")({
  loader: async () => {
    const { data } = await supabaseAdmin
      .from("affiliate_leaderboard_30d")
      .select("referrer_user_id,activated_referrals,referral_earnings_cents")
      .limit(200);
    const rows = (data ?? []) as Row[];
    const ranked = rankLeaderboard(rows, 50);
    // Best-effort handle lookup; falls back to abbreviated user id.
    const ids = ranked.map((r) => r.referrer_user_id);
    const { data: handles } = ids.length
      ? await supabaseAdmin.from("profiles").select("user_id,handle").in("user_id", ids)
      : { data: [] };
    const handleMap = new Map((handles ?? []).map((h: { user_id: string; handle: string }) => [h.user_id, h.handle]));
    return { rows: ranked.map((r) => ({ ...r, handle: handleMap.get(r.referrer_user_id) ?? null })) };
  },
  head: () => ({
    meta: [
      { title: "Affiliate Leaderboard — top referrers of the last 30 days" },
      { name: "description", content: "Top contributors driving signups to Super Agent Skill, ranked by activations and referral earnings over the past 30 days." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { rows } = Route.useLoaderData();
  return (
    <SitePage>
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-2">Affiliate Leaderboard</h1>
      <p className="text-muted-foreground mb-6">
        Top referrers over the last 30 days. Earn 10% of every referred author's revenue share for 12 months.
        Get your link at <a className="underline" href="/account/referrals">/account/referrals</a>.
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Leaderboard is just warming up"
          body="Grab your referral link and bring the first activated author. Earn 10% of their revenue share for 12 months."
          cta={{ label: "Get my referral link", href: "/account/referrals" }}
        />
      ) : (
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full min-w-[520px]">
            <thead className="border-b text-left text-sm text-muted-foreground">
              <tr><th className="py-2">#</th><th>Referrer</th><th className="text-right">Activations</th><th className="text-right">Earnings</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.referrer_user_id} className="border-b">
                  <td className="py-2 font-mono">{i + 1}</td>
                  <td>@{r.handle ?? r.referrer_user_id.slice(0, 8)}</td>
                  <td className="text-right">{r.activated_referrals}</td>
                  <td className="text-right">${(r.referral_earnings_cents / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
    </SitePage>
  );
}
