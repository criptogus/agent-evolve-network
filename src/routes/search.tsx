import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SitePage } from "@/components/site/SitePage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from "zod";
const Results = z.object({
  results: z.array(z.object({ slug: z.string(), name: z.string(), snippet: z.string() })),
});
export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search packages — Super Agent Skill" }] }),
  component: Search,
});
function Search() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [semantic, setSemantic] = useState(false);
  const [consent, setConsent] = useState(false);
  const [rows, setRows] = useState<z.infer<typeof Results>["results"]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <SitePage>
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-3xl font-semibold">Find the right package</h1>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const headers: Record<string, string> = {};
              if (semantic) {
                if (!user || !consent)
                  throw new Error("Sign in and allow embedding of this search query first.");
                const { data } = await supabase.auth.getSession();
                if (!data.session) throw new Error("Sign in again.");
                headers.Authorization = `Bearer ${data.session.access_token}`;
                headers["X-Semantic-Consent"] = "query-embedding";
              }
              const response = await fetch(
                `/api/public/search?q=${encodeURIComponent(q)}${semantic ? "&semantic=1" : ""}`,
                { headers, redirect: "error" },
              );
              if (!response.ok)
                throw new Error(
                  semantic
                    ? "Semantic search is unavailable or your daily allowance has been reached. Try keyword search."
                    : "Search is unavailable.",
                );
              setRows(Results.parse(await response.json()).results);
            } catch (err) {
              setRows([]);
              setError(err instanceof Error ? err.message : "Search failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            What do you need?
            <Input
              required
              minLength={2}
              maxLength={2000}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={semantic}
              onChange={(e) => {
                setSemantic(e.target.checked);
                setConsent(false);
              }}
            />
            Search by meaning
          </label>
          {semantic && (
            <div className="rounded-xl border p-4 space-y-2">
              <p>
                Semantic search sends your query to the configured embedding provider. Do not
                include secrets or personal data. Sign-in is required, with at most 20 uncached
                requests per day.
              </p>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                Allow embedding of this query
              </label>
            </div>
          )}
          <Button disabled={busy || (semantic && (!user || !consent))}>
            {busy ? "Searching…" : "Search"}
          </Button>
        </form>
        {error && <p role="alert">{error}</p>}
        <ul className="space-y-4">
          {rows.map((row) => (
            <li className="rounded-xl border p-4" key={row.slug}>
              <Link to="/marketplace/$packageId" params={{ packageId: row.slug }}>
                {row.name}
              </Link>
              <p>{row.snippet}</p>
            </li>
          ))}
        </ul>
      </main>
    </SitePage>
  );
}
