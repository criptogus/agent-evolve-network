import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Sparkles, Zap } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { McpTester } from "@/components/site/McpTester";

// `?slug=<package>` deep-links from package pages prefill a get_package call,
// so visitors can test-drive a skill before installing it.
const SearchSchema = z.object({
  tool: z
    .enum([
      "list_packages",
      "search_registry",
      "get_package",
      "request_primitive",
      "upload_packages",
    ])
    .optional()
    .catch(undefined),
  slug: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/play")({
  validateSearch: (s) => SearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Playground — Super Agent Skill MCP" },
      {
        name: "description",
        content:
          "Try every Super Agent Skill MCP tool in your browser — no install, no JSON, no auth needed for reads. Connect via OAuth to test write tools.",
      },
      { property: "og:title", content: "Try the MCP server in your browser — Super Agent Skill" },
    ],
  }),
  component: PlaygroundPage,
});

function PlaygroundPage() {
  const search = Route.useSearch();
  const initialTool = search.slug && !search.tool ? "get_package" : search.tool;
  const initialArgs = search.slug ? { slug: search.slug } : undefined;
  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Playground</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
          Try the MCP server in your browser.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Pick a tool, fill the args, hit run. Read tools work anonymously; write tools need a
          token. Same endpoint your agents hit (<code className="font-mono text-xs">/api/public/mcp</code>
          ), same shape, same rate limits — nothing to install.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Highlight
            icon={Zap}
            title="Zero install"
            body="No JSON config, no CLI. Browser talks directly to /api/public/mcp."
          />
          <Highlight
            icon={Sparkles}
            title="Real responses"
            body="Same registry, same trust scores, same forge. What you see here is what your agent sees."
          />
          <Highlight
            icon={Zap}
            title="Token-aware"
            body="Paste a personal access token to unlock write tools without OAuth."
          />
        </div>

        <div className="mt-10">
          <McpTester
            key={`${initialTool ?? "default"}-${search.slug ?? ""}`}
            initialTool={initialTool}
            initialArgs={initialArgs}
          />
        </div>

        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
            Like what you see?
          </p>
          <p className="mt-2 text-sm">
            Hook your real agent up in seconds — one-click installs and per-client guides at{" "}
            <Link to="/connect" className="text-primary hover:underline">
              /connect
            </Link>
            , or generate a token at{" "}
            <Link to="/account/tokens" className="text-primary hover:underline">
              /account/tokens
            </Link>{" "}
            and paste it as a Bearer header anywhere.
          </p>
        </section>
      </main>
    </SitePage>
  );
}

function Highlight({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
