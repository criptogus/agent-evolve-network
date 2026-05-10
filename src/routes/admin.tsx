import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Button } from "@/components/ui/button";
import { getMyAdminStatus, claimAdminBootstrap } from "@/lib/admin/accounts.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Super Agent Skill" },
      { name: "description", content: "Manage accounts, plans, packages, and on-demand primitive creation." },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/accounts", label: "Accounts" },
  { to: "/admin/plans", label: "Plans" },
  { to: "/admin/packages", label: "Packages" },
  { to: "/admin/packages/new", label: "Wizard" },
  { to: "/admin/import/github", label: "Import · GitHub" },
  { to: "/admin/import/markdown", label: "Import · Markdown" },
  { to: "/admin/requests", label: "Requests" },
];

function AdminLayout() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const checkStatus = useServerFn(getMyAdminStatus);
  const bootstrap = useServerFn(claimAdminBootstrap);
  const [bootstrapMsg, setBootstrapMsg] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(!!s);
      setAuthReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const status = useQuery({
    queryKey: ["admin", "status"],
    queryFn: () => checkStatus(),
    enabled: authReady && signedIn,
    retry: false,
  });

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="mx-auto max-w-7xl px-6 py-12 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold">Admin sign-in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need to sign in with an admin account to access the control panel.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/forge" })}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (status.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="mx-auto max-w-7xl px-6 py-12 text-sm text-muted-foreground">Verifying admin role…</div>
      </div>
    );
  }

  if (!status.data?.isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold">Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have the admin role yet. If this is a fresh project, you can claim
            the first admin seat below.
          </p>
          <Button
            className="mt-6"
            onClick={async () => {
              try {
                await bootstrap();
                setBootstrapMsg("You are now admin. Reloading…");
                setTimeout(() => window.location.reload(), 600);
              } catch (e: any) {
                setBootstrapMsg(e?.message ?? "Could not claim admin");
              }
            }}
          >
            Claim first admin seat
          </Button>
          {bootstrapMsg && <p className="mt-3 text-xs text-muted-foreground">{bootstrapMsg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.exact }}
                activeProps={{ className: "bg-secondary text-foreground" }}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
