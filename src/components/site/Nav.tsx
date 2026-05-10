import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="text-[15px] font-semibold tracking-tight">AgentForge</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/discover" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Discover</Link>
            <Link to="/generate" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Generate</Link>
            <Link to="/marketplace" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Marketplace</Link>
            <Link to="/skillforge" className="text-sm text-muted-foreground transition-colors hover:text-foreground">SkillForge</Link>
            <Link to="/evolution" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Evolution</Link>
            <Link to="/docs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Docs</Link>
            <Link to="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Pricing</Link>
            <a href="https://github.com" className="text-sm text-muted-foreground transition-colors hover:text-foreground">GitHub</a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a href="#" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline">Sign in</a>
          <Link
            to="/onboarding"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
          >
            Connect agent
          </Link>
        </div>
      </div>
    </header>
  );
}
