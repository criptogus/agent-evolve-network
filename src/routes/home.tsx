import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Library,
  PlugZap,
  Search,
  Sparkles,
  Star,
  Trophy,
  Upload,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CodeBlockCopy } from "@/components/site/CopyButton";
import { useAuth } from "@/hooks/use-auth";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { getCreditSummary } from "@/lib/credits/credits.functions";
import { listMarketplace } from "@/lib/marketplace/list.functions";
import { rankRecommended } from "@/lib/marketplace/recommend";

const TITLE = "Your command center — Super Agent Skill";
const DESCRIPTION =
  "Signed-in home: connect your agent, install tested skills, build corporate agents and track your library.";
const MCP_URL = "https://superagentskill.com/api/public/mcp";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomeDashboard,
});

type Action = { to: string; label: string; hint: string; icon: LucideIcon };

const PRIMARY: Action[] = [
  {
    to: "/marketplace",
    label: "Browse the marketplace",
    hint: "Install tested skills, playbooks, souls and guardrails.",
    icon: Sparkles,
  },
  {
    to: "/agents",
    label: "Agent Store",
    hint: "Deploy a ready-made corporate agent in minutes.",
    icon: Bot,
  },
  {
    to: "/agents/new",
    label: "Build your own agent",
    hint: "Soul, guardrails and skills generated from one prompt.",
    icon: GraduationCap,
  },
];

const SECONDARY: Action[] = [
  { to: "/connect", label: "Connect an agent", hint: "MCP endpoint & setup", icon: PlugZap },
  { to: "/discover", label: "Discover", hint: "Search everything", icon: Search },
  { to: "/account/library", label: "My library", hint: "What you installed", icon: Library },
  { to: "/skillforge", label: "My SkillForge", hint: "Your stack & Trust Score", icon: Trophy },
  { to: "/upload", label: "Publish a skill", hint: "Upload & get graded", icon: Upload },
  { to: "/diagnose", label: "University", hint: "Diagnose & train agents", icon: BookOpen },
  { to: "/account/credits", label: "Credits", hint: "Balance & usage", icon: CreditCard },
  { to: "/docs", label: "Docs", hint: "API, MCP & SDKs", icon: BookOpen },
];

function timeAgo(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function HomeDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { status: connection, loading: connLoading } = useConnectionStatus();

  const fetchCredits = useServerFn(getCreditSummary);
  const credits = useQuery({
    queryKey: ["home-credits", user?.id ?? "anon"],
    queryFn: async () => {
      try {
        return await fetchCredits();
      } catch {
        return null;
      }
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
    throwOnError: false,
  });

  const fetchMarket = useServerFn(listMarketplace);
  const market = useQuery({
    queryKey: ["home-trending"],
    queryFn: async () => {
      try {
        return await fetchMarket();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
    throwOnError: false,
  });

  const trending = useMemo(
    () => rankRecommended(market.data?.items ?? [], 6),
    [market.data],
  );


  // Signed-out visitors belong on the landing page, which sells the product.
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  const firstName =
    (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    null;

  const steps = [
    {
      done: connection.connected,
      label: "Connect your agent to the MCP endpoint",
      to: "/connect",
      cta: "Connect",
    },
    {
      done: connection.installCount > 0,
      label: "Install your first tested capability",
      to: "/marketplace",
      cta: "Browse skills",
    },
    {
      done: !!connection.lastUsedAt,
      label: "Run a real task through your agent",
      to: "/docs",
      cta: "See how",
    },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="border-b border-border bg-surface/60">
        <div className="mx-auto max-w-7xl px-6 py-10 md:py-12">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            Command center
          </span>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
            </h1>
            {!connLoading && (
              <span
                className={
                  connection.connected
                    ? "inline-flex items-center gap-1.5 rounded-full border border-signal/50 bg-signal/15 px-2.5 py-1 text-xs font-medium"
                    : "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
                }
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${connection.connected ? "bg-signal" : "bg-muted-foreground"}`}
                />
                {connection.connected ? "Agent connected" : "Not connected yet"}
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {/* Connection / next steps */}
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              {connection.connected ? (
                <>
                  <h2 className="text-base font-semibold tracking-tight">
                    Your agent is connected
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {connection.oauthClientCount + connection.tokenCount} active credential
                    {connection.oauthClientCount + connection.tokenCount === 1 ? "" : "s"}
                    {connection.clientNames.length
                      ? ` · ${connection.clientNames.join(", ")}`
                      : ""}
                    {connection.lastUsedAt ? ` · last call ${timeAgo(connection.lastUsedAt)}` : ""}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-base font-semibold tracking-tight">Start here</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Paste this MCP URL into Claude, Hermes or ChatGPT and your agent can use
                    everything below.
                  </p>
                  <div className="mt-4 max-w-md">
                    <CodeBlockCopy code={MCP_URL} label="copy MCP url" />
                  </div>
                </>
              )}

              <ul className="mt-5 space-y-2">
                {steps.map((s) => (
                  <li key={s.label} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${s.done ? "text-signal" : "text-muted-foreground/40"}`}
                      aria-hidden
                    />
                    <span className={s.done ? "text-muted-foreground line-through" : ""}>
                      {s.label}
                    </span>
                    {!s.done && (
                      <Link
                        to={s.to}
                        className="ml-auto shrink-0 text-xs font-medium text-primary hover:underline"
                      >
                        {s.cta} →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {remaining === 0 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Setup complete. Keep going: run the{" "}
                  <Link to="/diagnose" className="text-primary hover:underline">
                    admission exam
                  </Link>{" "}
                  to find the next capability worth installing.
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                to="/account/credits"
                className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <span>
                  <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Credits
                  </span>
                  <span className="mt-1 block text-2xl font-semibold tabular-nums">
                    {(credits.data?.balance ?? 0).toLocaleString()}
                  </span>
                </span>
                <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
              </Link>
              <Link
                to="/account/library"
                className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <span>
                  <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Installed
                  </span>
                  <span className="mt-1 block text-2xl font-semibold tabular-nums">
                    {connection.installCount}
                  </span>
                </span>
                <Library className="h-5 w-5 text-muted-foreground" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {PRIMARY.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:shadow-elevated"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <a.icon className="h-5 w-5" aria-hidden />
                </span>
                <h2 className="mt-4 text-base font-semibold tracking-tight">{a.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{a.hint}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Ready to install */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Ready to install
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Highest Trust Score in the registry right now.
            </p>
          </div>
          <Link to="/marketplace" className="shrink-0 text-sm font-medium text-primary hover:underline">
            All skills →
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {market.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          {trending.map((p) => (
            <Link
              key={p.slug}
              to="/marketplace/$packageId"
              params={{ packageId: p.slug }}
              className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold">{p.name}</span>
                {p.trust_score !== null && (
                  <span className="shrink-0 rounded border border-signal/40 bg-signal/10 px-1.5 py-0.5 font-mono text-[10px]">
                    {Math.round(p.trust_score * 100)}
                  </span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
              <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{p.type}</span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" aria-hidden />
                  {p.rating_avg || "—"}
                </span>
                <span>{p.install_count} installs</span>
              </div>
            </Link>
          ))}
          {!market.isLoading && trending.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No published packages yet.{" "}
              <Link to="/upload" className="text-primary hover:underline">
                Publish the first one
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Everything else
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SECONDARY.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <a.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{a.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{a.hint}</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          Looking for the public landing page?
          <Link to="/" search={{ stay: 1 }} className="text-primary hover:underline">
            View it here
          </Link>
        </p>
      </section>

      <Footer />
    </div>
  );
}
