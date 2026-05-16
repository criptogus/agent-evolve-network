import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { ReferralCapture } from "@/components/referrals/ReferralCapture";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { getNormalizedMalformedOauthAuthorizeUrl } from "@/lib/oauth/normalize";

function NotFoundComponent() {
  const normalizedOauthUrl = getNormalizedMalformedOauthAuthorizeUrl();
  if (normalizedOauthUrl) {
    window.location.replace(normalizedOauthUrl);
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Super Agent Skill" },
      {
        name: "description",
        content:
          "Super Agent Skill turns AI agents into continuously evolving specialists via MCP.",
      },
      { name: "author", content: "Super Agent Skill" },
      { name: "google-site-verification", content: "_XaKwKLlTaHmSy8DgH5RB4dmOTlyKH0HYjcRylGuacQ" },
      { property: "og:site_name", content: "Super Agent Skill" },
      { property: "og:title", content: "Super Agent Skill" },
      {
        property: "og:description",
        content:
          "Super Agent Skill turns AI agents into continuously evolving specialists via MCP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@superagentskill" },
      { name: "twitter:title", content: "Super Agent Skill" },
      {
        name: "twitter:description",
        content:
          "Super Agent Skill turns AI agents into continuously evolving specialists via MCP.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/31e8f1c8-d61a-43e0-a6cf-bc7dc826978f/id-preview-a810735d--b00a8021-9d8d-4f49-a581-628727b71f68.lovable.app-1778445620031.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/31e8f1c8-d61a-43e0-a6cf-bc7dc826978f/id-preview-a810735d--b00a8021-9d8d-4f49-a581-628727b71f68.lovable.app-1778445620031.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "alternate", type: "application/xml", title: "Sitemap", href: "/sitemap.xml" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AnalyticsTracker() {
  const router = useRouter();
  useEffect(() => {
    initAnalytics();
    trackPageView(router.state.location.pathname);
    const unsub = router.subscribe("onResolved", ({ toLocation }) => {
      trackPageView(toLocation.pathname);
    });
    return unsub;
  }, [router]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsTracker />
      <ReferralCapture />
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <div id="main">
        <Outlet />
      </div>
    </QueryClientProvider>
  );
}
