import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Github, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { CreditsPill } from "./CreditsPill";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyAdminStatus } from "@/lib/admin/accounts.functions";
import { useConnectionStatus } from "@/hooks/use-connection-status";

const GITHUB_URL = "https://github.com/criptogus/agent-evolve-network";
const TWITTER_URL = "https://x.com/superagentskill";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2H21.5l-7.51 8.583L22.5 22h-6.86l-5.37-6.93L4.1 22H.84l8.04-9.19L1.5 2h7.02l4.86 6.43L18.244 2Zm-2.4 18h1.9L7.26 4H5.24l10.604 16Z" />
    </svg>
  );
}

type NavItem = { to: string; label: string; hint?: string };

/**
 * Public navigation is deliberately five entries — Agents, Skills, How it
 * works, Pricing, Docs — so a first-time visitor never has to understand the
 * internal architecture. Creator/publishing tools live under "Publish" and
 * only appear once someone is signed in.
 */
const SKILLS: NavItem[] = [
  { to: "/marketplace", label: "Marketplace", hint: "Top skills, ranked by Trust Score" },
  { to: "/discover", label: "Discover", hint: "Search everything" },
  { to: "/packs", label: "Packs", hint: "Curated bundles" },
  { to: "/match", label: "Match", hint: "Pair skills to a goal" },
];

const AGENTS_MENU: NavItem[] = [
  { to: "/agents", label: "Agent Store", hint: "Ready-to-use corporate agents" },
  { to: "/agents/new", label: "Build an agent", hint: "Agent Factory (Agent Pass)" },
];

const PUBLISH: NavItem[] = [
  { to: "/generate", label: "Create a skill", hint: "From a one-line idea" },
  { to: "/upload", label: "Upload a skill", hint: "Bring your own file" },
  { to: "/forge", label: "Skill Studio", hint: "Advanced editor & evaluation" },
  { to: "/skillforge", label: "My SkillForge", hint: "Your installed stack & Trust Score" },
  { to: "/bounties", label: "Bounties", hint: "Get paid to publish skills" },
  { to: "/community", label: "Community", hint: "Creators, leaderboards, use cases" },
];

const SIMPLE: NavItem[] = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/docs", label: "Docs" },

];

function NavDropdown({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none">
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to} className="flex flex-col items-start gap-0.5 py-2">
              <span className="text-sm font-medium">{item.label}</span>
              {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const checkAdmin = useServerFn(getMyAdminStatus);
  const adminQuery = useQuery({
    queryKey: ["admin", "status", user?.id ?? null],
    queryFn: () => checkAdmin(),
    enabled: !!user,
    retry: false,
    staleTime: 60_000,
  });
  const isAdmin = !!adminQuery.data?.isAdmin;
  const { status: connection } = useConnectionStatus();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6 lg:gap-8">
          <Link to={user ? "/home" : "/"} className="flex shrink-0 items-center gap-2">
            <Logo className="h-6 w-6 shrink-0" />
            <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight">
              Super Agent Skill
            </span>
          </Link>
          <nav className="hidden min-w-0 items-center gap-5 lg:flex">
            <NavDropdown label="Agents" items={AGENTS_MENU} />
            <NavDropdown label="Skills" items={SKILLS} />
            {user ? <NavDropdown label="Publish" items={PUBLISH} /> : null}

            {SIMPLE.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle className="hidden h-8 w-8 sm:inline-flex" />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="hidden h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href={TWITTER_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="X (@superagentskill)"
            className="hidden h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            <XIcon className="h-3.5 w-3.5" />
          </a>
          {user ? (
            <>
              <CreditsPill />
              <DropdownMenu>
                <DropdownMenuTrigger className="hidden h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none lg:inline-flex">
                  Account
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/account/agents">My agents</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/packages">My packages</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/library">My library</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/earnings">Earnings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/billing">Billing</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/credits">Credits</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/connections">Connections</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/tokens">API tokens</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/encryption">Encryption (BYOK)</Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {connection.connected ? (
                <Link
                  to="/account/connections"
                  title={
                    connection.clientNames.length
                      ? `Connected: ${connection.clientNames.join(", ")}`
                      : "Your agent is connected"
                  }
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-signal/50 bg-signal/15 px-3 text-sm font-medium text-foreground transition-colors hover:bg-signal/25"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_6px_var(--signal)]"
                  />
                  Connected
                </Link>
              ) : (
                <Link
                  to="/connect"
                  className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
                >
                  Connect
                </Link>
              )}

            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground lg:inline"
              >
                Sign in
              </Link>
              <Link
                to="/connect"
                className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
              >
                <span className="hidden sm:inline">Try with my agent</span>
                <span className="sm:hidden">Try it</span>
              </Link>

            </>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-left">
                  <Logo className="h-5 w-5" />
                  Super Agent Skill
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-4">
                <MobileSection title="Agents" items={AGENTS_MENU} onNavigate={() => setOpen(false)} />
                <MobileSection title="Skills" items={SKILLS} onNavigate={() => setOpen(false)} />
                {user ? (
                  <MobileSection
                    title="Publish"
                    items={PUBLISH}
                    onNavigate={() => setOpen(false)}
                  />
                ) : null}
                <MobileSection title="More" items={SIMPLE} onNavigate={() => setOpen(false)} />


                <div className="mt-2 border-t border-border pt-4">
                  {user ? (
                    <div className="flex flex-col gap-1">
                      <MobileLink to="/account/agents" onNavigate={() => setOpen(false)}>
                        My agents
                      </MobileLink>
                      <MobileLink to="/account/packages" onNavigate={() => setOpen(false)}>
                        My packages
                      </MobileLink>
                      <MobileLink to="/account/library" onNavigate={() => setOpen(false)}>
                        My library
                      </MobileLink>
                      <MobileLink to="/account/earnings" onNavigate={() => setOpen(false)}>
                        Earnings
                      </MobileLink>
                      <MobileLink to="/account/billing" onNavigate={() => setOpen(false)}>
                        Billing
                      </MobileLink>
                      <MobileLink to="/account/credits" onNavigate={() => setOpen(false)}>
                        Credits
                      </MobileLink>
                      <MobileLink to="/account/connections" onNavigate={() => setOpen(false)}>
                        Connections
                      </MobileLink>
                      <MobileLink to="/account/tokens" onNavigate={() => setOpen(false)}>
                        API tokens
                      </MobileLink>
                      <MobileLink to="/account/encryption" onNavigate={() => setOpen(false)}>
                        Encryption (BYOK)
                      </MobileLink>
                      {isAdmin && (

                        <MobileLink to="/admin" onNavigate={() => setOpen(false)}>
                          Admin
                        </MobileLink>
                      )}
                      <button
                        onClick={() => {
                          setOpen(false);
                          signOut();
                        }}
                        className="rounded-md px-3 py-2.5 text-left text-[15px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                      >
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <MobileLink to="/login" onNavigate={() => setOpen(false)}>
                      Sign in
                    </MobileLink>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function MobileSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {items.map((item) => (
        <MobileLink key={item.to} to={item.to} onNavigate={onNavigate}>
          {item.label}
        </MobileLink>
      ))}
    </div>
  );
}

function MobileLink({
  to,
  onNavigate,
  children,
}: {
  to: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="rounded-md px-3 py-2.5 text-[15px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
    >
      {children}
    </Link>
  );
}
