import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Github } from "lucide-react";
import { Logo } from "./Logo";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { CreditsPill } from "./CreditsPill";

const GITHUB_URL = "https://github.com/super-agent-skill/super-agent-skill";

const NAV_LINKS = [
  { to: "/discover", label: "Discover" },
  { to: "/generate", label: "Generate" },
  { to: "/match", label: "Match" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/upload", label: "Upload" },
  { to: "/skillforge", label: "SkillForge" },
  { to: "/forge", label: "Forge" },
  { to: "/evolution", label: "Evolution" },
  { to: "/evaluation", label: "Evaluation" },
  { to: "/connect", label: "Connect" },
  { to: "/docs", label: "Docs" },
  { to: "/pricing", label: "Pricing" },
] as const;

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
          <nav className="hidden min-w-0 items-center gap-5 xl:flex">
            {NAV_LINKS.map((l) => (
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
              <Link
                to="/account/billing"
                className="hidden whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground lg:inline"
              >
                Account
              </Link>
              <button
                onClick={() => signOut()}
                className="hidden whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground lg:inline"
              >
                Sign out
              </button>
              <Link
                to="/onboarding"
                className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
              >
                <span className="hidden sm:inline">Connect agent</span>
                <span className="sm:hidden">Connect</span>
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground xl:hidden"
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
              <nav className="mt-6 flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-[15px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link
                      to="/account/credits"
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2.5 text-[15px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                    >
                      Credits
                    </Link>
                    <Link
                      to="/account/billing"
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2.5 text-[15px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                    >
                      Account & Billing
                    </Link>
                    <button
                      onClick={() => { setOpen(false); signOut(); }}
                      className="rounded-md px-3 py-2.5 text-left text-[15px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-[15px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
