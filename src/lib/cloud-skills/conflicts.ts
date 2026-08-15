/**
 * Conflict detection + resolution for cloud → local skill sync.
 *
 * A conflict is "a file already exists at the target path and its content is
 * not what we would write". Pure functions only: the MCP tool, the UI and the
 * tests all resolve conflicts identically, and the agent never has to guess.
 */

export type ConflictStrategy = "ask" | "overwrite" | "merge" | "keep_both";

export const CONFLICT_STRATEGIES: {
  id: ConflictStrategy;
  label: string;
  description: string;
}[] = [
  {
    id: "ask",
    label: "Ask me",
    description:
      "Detect conflicts and report them without writing. The agent shows the diff summary and waits for your call.",
  },
  {
    id: "overwrite",
    label: "Overwrite",
    description: "The cloud version wins. Local edits at that path are replaced.",
  },
  {
    id: "merge",
    label: "Merge",
    description:
      "Cloud version is written and any local-only lines are preserved under a clearly marked 'Local additions' section.",
  },
  {
    id: "keep_both",
    label: "Keep both",
    description:
      "Local file is left untouched; the cloud version is written next to it with a `-sak` suffix.",
  },
];

export const MERGE_MARKER = "## Local additions (kept by SAK sync)";

/** Stable, dependency-free content hash (FNV-1a, hex) for change detection. */
export function contentHash(input: string): string {
  let h = 0x811c9dc5;
  const s = normalize(input);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Ignore trailing whitespace and line-ending noise so cosmetics aren't conflicts. */
export function normalize(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .trim();
}

export type LocalFile = {
  slug: string;
  /** Version previously synced, when the client tracks it. */
  version?: number;
  /** Full local content, when available — enables real conflict detection. */
  content?: string;
  /** Or just its hash, produced by contentHash(). */
  content_hash?: string;
};

export type ConflictKind = "none" | "identical" | "diverged" | "unknown";

export type Conflict = {
  slug: string;
  path: string;
  kind: ConflictKind;
  local_lines?: number;
  cloud_lines?: number;
  local_only_lines?: number;
  detail: string;
};

/** Classify one target against what exists locally. */
export function detectConflict(args: {
  slug: string;
  path: string;
  incoming: string;
  cloudVersion?: number | null;
  local?: LocalFile;
}): Conflict {
  const { slug, path, incoming, local } = args;
  if (!local) return { slug, path, kind: "none", detail: "No file at the target path." };

  const incomingHash = contentHash(incoming);
  const localHash = local.content !== undefined ? contentHash(local.content) : local.content_hash;

  if (!localHash) {
    const sameVersion =
      local.version !== undefined && args.cloudVersion != null && local.version === args.cloudVersion;
    return {
      slug,
      path,
      kind: sameVersion ? "identical" : "unknown",
      detail: sameVersion
        ? "Same synced version, assumed unchanged."
        : "A file exists but no content or hash was provided, so divergence cannot be proven. Send `content` or `content_hash` to get an exact answer.",
    };
  }

  if (localHash === incomingHash) {
    return { slug, path, kind: "identical", detail: "Local file already matches the cloud version." };
  }

  const localBody = local.content ? normalize(local.content) : "";
  const cloudBody = normalize(incoming);
  const cloudLines = new Set(cloudBody.split("\n"));
  const localOnly = localBody
    ? localBody.split("\n").filter((l) => l.trim() && !cloudLines.has(l)).length
    : undefined;

  return {
    slug,
    path,
    kind: "diverged",
    local_lines: localBody ? localBody.split("\n").length : undefined,
    cloud_lines: cloudBody.split("\n").length,
    local_only_lines: localOnly,
    detail: localOnly
      ? `Local file differs: ${localOnly} line(s) exist only locally.`
      : "Local file differs from the cloud version.",
  };
}

/**
 * Line-level union merge: the cloud version stays authoritative, local-only
 * lines are appended under a marked section instead of being lost. Idempotent —
 * re-merging an already merged file does not duplicate the section.
 */
export function mergeContents(incoming: string, localContent: string): string {
  const cloud = normalize(incoming);
  const local = normalize(localContent);
  const previous = local.split(MERGE_MARKER);
  const localBody = previous[0] ?? "";
  const previouslyKept = previous.length > 1 ? previous.slice(1).join("\n") : "";

  const cloudLines = new Set(cloud.split("\n").map((l) => l.trim()));
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const line of `${localBody}\n${previouslyKept}`.split("\n")) {
    const t = line.trim();
    if (!t || t === "---" || cloudLines.has(t) || seen.has(t)) continue;
    if (/^(name|slug|description|category|tags|version|source|alwaysApply):/.test(t)) continue;
    seen.add(t);
    kept.push(line);
  }

  if (!kept.length) return `${cloud}\n`;
  return `${cloud}\n\n${MERGE_MARKER}\n\n${kept.join("\n")}\n`;
}

/** Path used by the keep-both strategy. */
export function keepBothPath(path: string): string {
  const dot = path.lastIndexOf(".");
  const slash = path.lastIndexOf("/");
  if (path.endsWith("/SKILL.md")) {
    const dir = path.slice(0, -"/SKILL.md".length);
    return `${dir}-sak/SKILL.md`;
  }
  if (dot > slash) return `${path.slice(0, dot)}-sak${path.slice(dot)}`;
  return `${path}-sak`;
}

export type ResolvedFile = {
  slug: string;
  path: string;
  content: string;
  action: "create" | "update" | "overwrite" | "merge" | "keep_both" | "skip";
  conflict: ConflictKind;
  note?: string;
};

/** Apply the chosen strategy to one detected conflict. */
export function resolveConflict(args: {
  slug: string;
  path: string;
  incoming: string;
  conflict: Conflict;
  strategy: ConflictStrategy;
  local?: LocalFile;
}): ResolvedFile {
  const { slug, path, incoming, conflict, strategy, local } = args;

  if (conflict.kind === "none")
    return { slug, path, content: incoming, action: "create", conflict: "none" };
  if (conflict.kind === "identical")
    return {
      slug,
      path,
      content: incoming,
      action: "skip",
      conflict: "identical",
      note: "Already up to date.",
    };

  if (strategy === "ask")
    return {
      slug,
      path,
      content: incoming,
      action: "skip",
      conflict: conflict.kind,
      note: "Conflict left unresolved: re-run with conflict_strategy overwrite | merge | keep_both.",
    };

  if (strategy === "keep_both")
    return {
      slug,
      path: keepBothPath(path),
      content: incoming,
      action: "keep_both",
      conflict: conflict.kind,
      note: "Local file untouched; cloud version written alongside it.",
    };

  if (strategy === "merge") {
    if (!local?.content)
      return {
        slug,
        path,
        content: incoming,
        action: "skip",
        conflict: conflict.kind,
        note: "Merge needs the local `content` of this file. Send it, or choose overwrite / keep_both.",
      };
    return {
      slug,
      path,
      content: mergeContents(incoming, local.content),
      action: "merge",
      conflict: conflict.kind,
      note: `Local-only lines preserved under "${MERGE_MARKER}".`,
    };
  }

  return {
    slug,
    path,
    content: incoming,
    action: "overwrite",
    conflict: conflict.kind,
    note: "Local edits at this path were replaced by the cloud version.",
  };
}
