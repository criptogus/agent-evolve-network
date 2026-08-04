import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CreditCard,
  GraduationCap,
  Library,
  PlugZap,
  Search,
  Sparkles,
  Trophy,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/hooks/use-auth";

const TITLE = "Your command center — Super Agent Skill";
const DESCRIPTION =
  "Signed-in home: connect your agent, install tested skills, build corporate agents and track your library.";

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

type Action = {
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

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

function HomeDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Signed-out visitors belong on the landing page, which sells the product.
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  const firstName =
    (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    null;

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="border-b border-border bg-surface/60">
        <div className="mx-auto max-w-7xl px-6 py-10 md:py-12">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            Command center
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Pick the next action. Everything here installs into your connected agent — nothing
            requires retraining.
          </p>

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
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
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
        <p className="mt-6 text-xs text-muted-foreground">
          Looking for the public landing page?{" "}
          <Link to="/" search={{ stay: 1 }} className="text-primary hover:underline">
            View it here
          </Link>
          .
        </p>
      </section>

      <Footer />
    </div>
  );
}
