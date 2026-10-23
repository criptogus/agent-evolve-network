import { useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordFunnelEvent } from "@/lib/telemetry/funnel.functions";

/** Stable anon id for correlating funnel events across a visitor's session. */
function getAnonHash(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const KEY = "sas_anon_id";
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id.slice(0, 64);
  } catch {
    return undefined;
  }
}

type EventName =
  | "hero_viewed"
  | "cta_clicked"
  | "signup_viewed"
  | "signup_started"
  | "signup_completed"
  | "signup_failed"
  | "install_button_clicked";

/** Fire-and-forget funnel event. Never throws, never blocks UI. */
export function useTrack() {
  const send = useServerFn(recordFunnelEvent);
  return useCallback(
    (event: EventName, props?: Record<string, string | number | boolean | null>) => {
      const anon = getAnonHash();
      void send({
        data: {
          event,
          anon_hash: anon,
          props: props ?? {},
        },
      }).catch(() => {});
    },
    [send],
  );
}

/** Fire a single event once per component mount (client-only). */
export function useTrackOnce(event: EventName, props?: Record<string, string | number | boolean | null>) {
  const track = useTrack();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(event, props);
  }, [event, track, props]);
}
