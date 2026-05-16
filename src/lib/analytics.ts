/**
 * Provider-agnostic, dependency-free analytics layer.
 *
 * Without configuration it is a safe no-op (useful for local/dev). When
 * `VITE_PUBLIC_POSTHOG_KEY` is set at build time it lazy-loads PostHog from
 * its CDN and forwards events. Events are also forwarded to `window.dataLayer`
 * (GA4 / GTM) and `window.posthog` if a host page already injected them, so a
 * different provider can be wired purely via env without code changes.
 *
 * The whole point: the conversion funnel must be measurable before any other
 * optimization can be judged.
 */

type Props = Record<string, unknown>;

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";

declare global {
  interface Window {
    posthog?: { capture: (e: string, p?: Props) => void; __loaded?: boolean };
    dataLayer?: unknown[];
  }
}

let initialized = false;

function isBrowser() {
  return typeof window !== "undefined";
}

/**
 * Inject the official PostHog loader exactly once, only when a key exists.
 * Implemented as a stringified snippet so it stays dependency-free and out of
 * TypeScript's way (the upstream snippet is deliberately untyped).
 */
function loadPostHog() {
  if (!POSTHOG_KEY || !isBrowser() || window.posthog?.__loaded) return;
  const snippet =
    `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags identify setPersonProperties group resetGroups reset get_distinct_id alias set_config opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);` +
    `window.posthog.init(${JSON.stringify(POSTHOG_KEY)},{api_host:${JSON.stringify(
      POSTHOG_HOST,
    )},capture_pageview:false});`;
  const el = document.createElement("script");
  el.textContent = snippet;
  document.head.appendChild(el);
  if (window.posthog) window.posthog.__loaded = true;
}

export function initAnalytics() {
  if (initialized || !isBrowser()) return;
  initialized = true;
  loadPostHog();
}

/** Fire a funnel event. Safe everywhere — no-ops on the server. */
export function track(event: string, props: Props = {}) {
  if (!isBrowser()) return;
  try {
    window.posthog?.capture(event, props);
    window.dataLayer?.push({ event, ...props });
    if (import.meta.env.DEV) {
      console.debug("[analytics]", event, props);
    }
  } catch {
    /* analytics must never break the UI */
  }
}

export function trackPageView(path: string) {
  track("$pageview", { $current_url: isBrowser() ? window.location.href : path, path });
}

/** Canonical funnel event names — keep call sites consistent. */
export const EVENTS = {
  ctaConnect: "cta_connect_click",
  ctaBrowse: "cta_browse_click",
  ctaPricing: "cta_pricing_click",
  mcpUrlCopied: "mcp_url_copied",
  connectClientSelected: "connect_client_selected",
  signupStarted: "signup_started",
  signupSubmitted: "signup_submitted",
  signupSucceeded: "signup_succeeded",
} as const;
