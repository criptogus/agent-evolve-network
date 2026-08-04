import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { captureRefFromUrl, getStoredRef, clearStoredRef } from "@/lib/referrals/capture";
import { claimReferral, recordReferralClick } from "@/lib/referrals/referrals.functions";

/**
 * Mounted at the root: captures ?ref= from URL into cookie/localStorage,
 * records the click for referral analytics, and after auth claims the
 * referral on the server (creates row + grants bonus).
 */
export function ReferralCapture() {
  const { user, loading } = useAuth();
  const claim = useServerFn(claimReferral);
  const trackClick = useServerFn(recordReferralClick);

  // Capture as early as possible on every navigation/landing.
  useEffect(() => {
    const code = captureRefFromUrl();
    if (!code) return;
    // Dedupe: one click per code per browser session.
    try {
      const key = `sas_ref_click_${code}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode — still record */
    }
    void trackClick({
      data: { code, target: typeof window !== "undefined" ? window.location.pathname : null },
    }).catch(() => {});
  }, [trackClick]);


  // Once logged in, attempt to claim a stored ref. Server enforces idempotency.
  useEffect(() => {
    if (loading || !user) return;
    const code = getStoredRef();
    if (!code) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await claim({
          data: {
            code,
            source_url: typeof window !== "undefined" ? window.location.pathname : null,
            package_slug: null,
          },
        });
        if (!cancelled && (res?.ok || res?.reason === "ALREADY_CLAIMED" || res?.reason === "SELF_REFERRAL")) {
          clearStoredRef();
        }
      } catch {
        /* swallow — we'll retry on next mount */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, claim]);

  return null;
}
