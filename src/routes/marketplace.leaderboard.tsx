import { createFileRoute, redirect } from "@tanstack/react-router";

// Consolidated into /discover (sort=popular) — one browsing surface instead of
// three (discover / leaderboard / rankings). Route kept as a redirect so old
// links and search results keep working.
export const Route = createFileRoute("/marketplace/leaderboard")({
  beforeLoad: () => {
    throw redirect({
      to: "/discover",
      search: { type: "skill", category: null, q: null, sort: "popular", page: 1 },
    });
  },
});
