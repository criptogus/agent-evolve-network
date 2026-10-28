// The storage migration is an explicit dependency, not permission to read
// arbitrary SQL or paths outside the frozen application source tree.
const SUPPORT_FILES = new Set([
  "scripts/evaluate-agent-match-comparison.ts",
  "supabase/migrations/20261025143000_agent_match_selection_cache.sql",
]);
export function assertMatchFrozenSourcePath(path: string) {
  if (
    path.split("/").includes("..") ||
    (!SUPPORT_FILES.has(path) &&
      !/^(src\/[\w./-]+\.(?:ts|tsx)|package(?:-lock)?\.json)$/.test(path))
  )
    throw new Error("Invalid frozen source path");
}
