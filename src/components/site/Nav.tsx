import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Github, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";
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

const GITHUB_URL = "https://github.com/criptogus/agent-evolve-network";

type NavItem = { to: string; label: string; hint?: string };

const BROWSE: NavItem[] = [
  { to: "/discover", label: "Discover", hint: "Find skills" },
  { to: "/marketplace", label: "Marketplace", hint: "Top skills" },
  { to: "/packs", label: "Packs", hint: "Curated bundles" },
];

const CREATE: NavItem[] = [
  { to: "/upload", label: "Upload a skill", hint: "Turn it into a super skill" },
  { to: "/generate", label: "Generate a skill", hint: "From a one-line idea" },
  { to: "/skillforge", label: "SkillForge", hint: "Guided builder" },
  { to: "/forge", label: "Forge", hint: "Advanced editor" },
  { to: "/discover", label: "Discover", hint: "AI auto-forges what's missing" },
  { to: "/evaluation", label: "Evaluation", hint: "Test & benchmark" },
  { to: "/match", label: "Match", hint: "Pair skills to a goal" },
];

const COMMUNITY: NavItem[] = [
  { to: "/skill-of-the-week", label: "Skill of the Week", hint: "Top skill, weekly" },
  { to: "/use-cases", label: "Use cases", hint: "By vertical & task" },
  { to: "/bounties", label: "Bounties", hint: "Get paid to publish skills" },
  { to: "/leaderboard", label: "Affiliate leaderboard", hint: "Top referrers (30d)" },
];

const SIMPLE: NavItem[] = [
  { to: "/connect", label: "Connect" },
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
              {item.hint && (
                <span className="text-xs text-muted-foreground">{item.hint}</span>
              )}
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6 lg:gap-8">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <Logo className="h-6 w-6 shrink-0" />
            <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight">
              Super Agent Skill
            </span>
          </Link>
          <nav className="hidden min-w-0 items-center gap-5 lg:flex">
            <NavDropdown label="Browse" items={BROWSE} />
            <NavDropdown label="Create" items={CREATE} />
            <NavDropdown label="Community" items={COMMUNITY} />
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
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="hidden h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            <Github className="h-4 w-4" />
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link
                to="/connect"
                className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
              >
                Connect
              </Link>
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
                to="/signup"
                className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
              >
                <span className="hidden sm:inline">Get started</span>
                <span className="sm:hidden">Start</span>
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
                <MobileSection title="Browse" items={BROWSE} onNavigate={() => setOpen(false)} />
                <MobileSection title="Create" items={CREATE} onNavigate={() => setOpen(false)} />
                <MobileSection title="Community" items={COMMUNITY} onNavigate={() => setOpen(false)} />
                <MobileSection title="More" items={SIMPLE} onNavigate={() => setOpen(false)} />

                <div className="mt-2 border-t border-border pt-4">
                  {user ? (
                    <div className="flex flex-col gap-1">
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
                      <button
                        onClick={() => { setOpen(false); signOut(); }}
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
