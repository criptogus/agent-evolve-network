import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STAGE_LABELS, TRIGGERS, classifyStage, type CrmStage, type TriggerId } from "@/lib/crm/segments";

export type CrmOverviewRow = {
  user_id: string;
  email: string | null;
  name: string;
  plan: string;
  paying: boolean;
  stage: CrmStage;
  stage_label: string;
  signed_up_at: string;
  last_active_at: string;
  days_idle: number;
  connected: boolean;
  reviews: number;
  diagnoses: number;
  agents: number;
  installs: number;
  residencies: number;
  published: number;
  executions_30d: number;
  credits_spent: number;
  monthly_usd_saved: number;
  headroom_monthly_usd: number;
  latest_grade: string | null;
  emails_7d: number;
  last_email_at: string | null;
  unsubscribed: boolean;
  next_trigger: string;
  next_best_action: string | null;
};

export type CrmOverview = {
  totals: {
    customers: number;
    paying: number;
    connected: number;
    activated: number;
    mrr_usd: number;
    avg_actions_per_customer: number;
    emails_last_7d: number;
    realized_monthly_usd: number;
    headroom_monthly_usd: number;
  };
  segments: Array<{ stage: CrmStage; label: string; count: number }>;
  rows: CrmOverviewRow[];
  triggers: Array<{ id: string; label: string; description: string; sent_30d: number }>;
};

export const getCrmOverview = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async (): Promise<CrmOverview> => {
    const { loadCustomerRows, buildSnapshot } = await import("@/lib/crm/snapshot.server");
    const { loadSentSummary } = await import("@/lib/crm/mailer.server");
    const { decideTrigger } = await import("@/lib/crm/segments");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const customers = await loadCustomerRows(500, 0);
    const rows: CrmOverviewRow[] = [];
    const segments = new Map<CrmStage, number>();
    let paying = 0;
    let connected = 0;
    let activated = 0;
    let mrrCents = 0;
    let actions = 0;
    let realized = 0;
    let headroom = 0;

    for (const c of customers) {
      const snapshot = await buildSnapshot(c);
      const sent = await loadSentSummary(c.user_id);
      const decision = decideTrigger(c, sent);
      const stage = snapshot.stage;
      segments.set(stage, (segments.get(stage) ?? 0) + 1);
      if (snapshot.paying) {
        paying += 1;
        const cents = c.price_cents ?? 0;
        mrrCents += c.plan_slug?.includes("year") ? Math.round(cents / 12) : cents;
      }
      if (snapshot.usage.connected) connected += 1;
      if (stage !== "new" && stage !== "connected") activated += 1;
      actions +=
        snapshot.usage.reviews +
        snapshot.usage.diagnoses +
        snapshot.usage.agents +
        snapshot.usage.installs +
        snapshot.usage.residencies +
        snapshot.usage.published;
      realized += snapshot.roi.monthly_usd_saved;
      headroom += snapshot.roi.headroom_monthly_usd;

      rows.push({
        user_id: c.user_id,
        email: c.email,
        name: snapshot.name,
        plan: snapshot.paying ? (c.plan_slug ?? "pro") : "free",
        paying: snapshot.paying,
        stage,
        stage_label: STAGE_LABELS[stage],
        signed_up_at: c.signed_up_at,
        last_active_at: c.last_active_at,
        days_idle: Math.round(snapshot.usage.days_idle),
        connected: snapshot.usage.connected,
        reviews: snapshot.usage.reviews,
        diagnoses: snapshot.usage.diagnoses,
        agents: snapshot.usage.agents,
        installs: snapshot.usage.installs,
        residencies: snapshot.usage.residencies,
        published: snapshot.usage.published,
        executions_30d: snapshot.usage.executions_30d,
        credits_spent: snapshot.usage.credits_spent,
        monthly_usd_saved: snapshot.roi.monthly_usd_saved,
        headroom_monthly_usd: snapshot.roi.headroom_monthly_usd,
        latest_grade: snapshot.roi.latest_grade,
        emails_7d: sent.last7d,
        last_email_at: sent.lastAnyAt,
        unsubscribed: c.crm_unsubscribed,
        next_trigger: decision.send ? decision.trigger : `— ${decision.reason}`,
        next_best_action: snapshot.opportunities[0]?.title ?? null,
      });
    }

    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: log } = await admin
      .from("crm_message_log")
      .select("trigger, created_at")
      .gte("created_at", since)
      .limit(5000);
    const sentByTrigger = new Map<string, number>();
    let emails7d = 0;
    const weekAgo = Date.now() - 7 * 86_400_000;
    for (const r of (log ?? []) as Array<{ trigger: string; created_at: string }>) {
      sentByTrigger.set(r.trigger, (sentByTrigger.get(r.trigger) ?? 0) + 1);
      if (new Date(r.created_at).getTime() >= weekAgo) emails7d += 1;
    }

    return {
      totals: {
        customers: customers.length,
        paying,
        connected,
        activated,
        mrr_usd: Math.round(mrrCents / 100),
        avg_actions_per_customer:
          customers.length > 0 ? Math.round((actions / customers.length) * 10) / 10 : 0,
        emails_last_7d: emails7d,
        realized_monthly_usd: Math.round(realized),
        headroom_monthly_usd: Math.round(headroom),
      },
      segments: (Object.keys(STAGE_LABELS) as CrmStage[]).map((stage) => ({
        stage,
        label: STAGE_LABELS[stage],
        count: segments.get(stage) ?? 0,
      })),
      rows,
      triggers: Object.values(TRIGGERS).map((t) => ({
        id: t.id,
        label: t.label,
        description: t.description,
        sent_30d: sentByTrigger.get(t.id) ?? 0,
      })),
    };
  });

export type CrmCustomerDetail = {
  name: string;
  email: string | null;
  stage: string;
  stage_label: string;
  paying: boolean;
  usage: Record<string, number | boolean>;
  roi: Record<string, unknown>;
  opportunities: Array<{ id: string; title: string; why: string; cta: string; href: string }>;
  messages: Array<{ trigger: string; subject: string | null; created_at: string; status: string }>;
  preview: { subject: string; heading: string; intro: string[]; bullets: string[]; metrics: Array<{ label: string; value: string; note?: string }> } | null;
  next_trigger: string;
};

export const getCrmCustomer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), trigger: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<CrmCustomerDetail> => {
    const { loadCustomerRows, buildSnapshot } = await import("@/lib/crm/snapshot.server");
    const { loadSentSummary } = await import("@/lib/crm/mailer.server");
    const { decideTrigger, STAGE_LABELS: LABELS } = await import("@/lib/crm/segments");
    const { buildMessage } = await import("@/lib/crm/copy");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const rows = await loadCustomerRows(1000, 0);
    const row = rows.find((r) => r.user_id === data.userId);
    if (!row) throw new Error("Customer not found");
    const snapshot = await buildSnapshot(row);
    const sent = await loadSentSummary(row.user_id);
    const decision = decideTrigger(row, sent);

    const { data: msgs } = await admin
      .from("crm_message_log")
      .select("trigger, roi_snapshot, created_at, message_id")
      .eq("user_id", row.user_id)
      .order("created_at", { ascending: false })
      .limit(30);

    const ids = ((msgs ?? []) as any[]).map((m) => m.message_id).filter(Boolean);
    const statuses = new Map<string, string>();
    if (ids.length) {
      const { data: logs } = await admin
        .from("email_send_log")
        .select("message_id, status, created_at")
        .in("message_id", ids)
        .order("created_at", { ascending: true });
      for (const l of (logs ?? []) as Array<{ message_id: string; status: string }>)
        statuses.set(l.message_id, l.status);
    }

    const previewTrigger = (data.trigger as TriggerId | undefined) ??
      (decision.send ? decision.trigger : "value_digest");
    const preview = buildMessage(previewTrigger as TriggerId, snapshot);

    return {
      name: snapshot.name,
      email: row.email,
      stage: snapshot.stage,
      stage_label: LABELS[snapshot.stage],
      paying: snapshot.paying,
      usage: snapshot.usage as unknown as Record<string, number | boolean>,
      roi: snapshot.roi as unknown as Record<string, unknown>,
      opportunities: snapshot.opportunities,
      messages: ((msgs ?? []) as any[]).map((m) => ({
        trigger: m.trigger,
        subject: m.roi_snapshot?.subject ?? null,
        created_at: m.created_at,
        status: statuses.get(m.message_id) ?? "unknown",
      })),
      preview: {
        subject: preview.subject,
        heading: preview.heading,
        intro: preview.intro,
        bullets: preview.bullets,
        metrics: preview.metrics,
      },
      next_trigger: decision.send ? decision.trigger : `— ${decision.reason}`,
    };
  });

export const sendCrmNow = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), trigger: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { loadCustomerRows } = await import("@/lib/crm/snapshot.server");
    const { sendCrmEmail } = await import("@/lib/crm/mailer.server");
    const rows = await loadCustomerRows(1000, 0);
    const row = rows.find((r) => r.user_id === data.userId);
    if (!row) throw new Error("Customer not found");
    const res = await sendCrmEmail({
      row,
      trigger: data.trigger as TriggerId,
      force: true,
    });
    return res;
  });

export const runCrmCadenceNow = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ dryRun: z.boolean().default(true) }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { runCadence } = await import("@/lib/crm/mailer.server");
    return runCadence({ dryRun: data.dryRun, maxSends: 50 });
  });

/** The customer's own value snapshot — powers the in-app "Your value so far" card. */
export type MyValueSummary = {
  stage: string;
  stage_label: string;
  paying: boolean;
  headline: string;
  metrics: Array<{ label: string; value: string; note?: string }>;
  next: Array<{ id: string; title: string; why: string; cta: string; href: string }>;
  disclaimer: string;
};

export const getMyValueSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyValueSummary> => {
    const { userId } = context as { userId: string };
    const { loadCustomerRows, buildSnapshot } = await import("@/lib/crm/snapshot.server");
    const rows = await loadCustomerRows(1000, 0);
    const row = rows.find((r) => r.user_id === userId);
    const empty: MyValueSummary = {
      stage: "new",
      stage_label: STAGE_LABELS.new,
      paying: false,
      headline: "Connect your agent to start measuring value.",
      metrics: [],
      next: [],
      disclaimer:
        "Projections use the public SAK benchmark at 10,000 runs per month — estimates, not guarantees.",
    };
    if (!row) return empty;

    const s = await buildSnapshot(row);
    const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
    const metrics: MyValueSummary["metrics"] = [];
    if (s.roi.improved_docs > 0) {
      metrics.push({
        label: "Avoidable spend removed",
        value: `${usd(s.roi.monthly_usd_saved)}/mo`,
        note: `${usd(s.roi.annual_usd_saved)}/year at 10k runs/mo`,
      });
      metrics.push({
        label: "Runs no longer needing a human",
        value: `${s.roi.rescued_runs_per_month.toLocaleString("en-US")}/mo`,
        note: `~${s.roi.engineer_hours_saved_per_month} engineer-hours`,
      });
      metrics.push({ label: "Trust Score points gained", value: `+${s.roi.points_gained}` });
    }
    if (s.roi.headroom_monthly_usd > 0)
      metrics.push({
        label: "Still on the table",
        value: `${usd(s.roi.headroom_monthly_usd)}/mo`,
        note: "if every reviewed doc reached grade A",
      });
    if (metrics.length === 0) {
      metrics.push({ label: "Skill reviews", value: String(s.usage.reviews) });
      metrics.push({ label: "Skills installed", value: String(s.usage.installs) });
    }

    return {
      stage: s.stage,
      stage_label: STAGE_LABELS[classifyStage(row)],
      paying: s.paying,
      headline:
        s.roi.improved_docs > 0
          ? `You improved ${s.roi.improved_docs} document(s) and removed ${usd(s.roi.monthly_usd_saved)}/month of avoidable spend.`
          : s.usage.connected
            ? "Your agent is connected. Run one review to get your first measured result."
            : "Connect your agent to start measuring value.",
      metrics,
      next: s.opportunities.slice(0, 3),
      disclaimer: empty.disclaimer,
    };
  });
