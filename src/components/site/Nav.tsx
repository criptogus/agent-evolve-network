import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

const NAV_LINKS = [
  { to: "/discover", label: "Discover" },
  { to: "/generate", label: "Generate" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/skillforge", label: "SkillForge" },
  { to: "/forge", label: "Forge" },
  { to: "/evolution", label: "Evolution" },
  { to: "/evaluation", label: "Evaluation" },
  { to: "/docs", label: "Docs" },
  { to: "/pricing", label: "Pricing" },
  { to: "/admin", label: "Admin" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6 lg:gap-8">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Logo className="h-6 w-6" />
            <span className="text-[15px] font-semibold tracking-tight">Super Agent Skill</span>
          </Link>
          <nav className="hidden items-center gap-5 xl:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a href="#" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline">Sign in</a>
          <Link
            to="/onboarding"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
          >
            Connect agent
          </Link>
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
                <a
                  href="https://github.com"
                  className="rounded-md px-3 py-2.5 text-[15px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                >
                  GitHub
                </a>
                <a
                  href="#"
                  className="rounded-md px-3 py-2.5 text-[15px] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground sm:hidden"
                >
                  Sign in
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
