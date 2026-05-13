import type { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

/**
 * Standard page chrome: Nav + main content + Footer. Use for every route
 * outside the marketing landing page so users never land on an "orphan"
 * screen without branding or navigation.
 *
 * <SitePage>
 *   <main className="...">…</main>
 * </SitePage>
 */
export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Nav />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
