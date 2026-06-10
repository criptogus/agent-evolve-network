import { createFileRoute, redirect } from "@tanstack/react-router";

// /connect is the canonical connection walkthrough (with per-client guides at
// /connect/$client). This route is kept as a redirect so old links keep working.
export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => {
    throw redirect({ to: "/connect" });
  },
});
