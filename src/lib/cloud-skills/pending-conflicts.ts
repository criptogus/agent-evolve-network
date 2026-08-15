/**
 * Pending sync conflicts: the queue an agent leaves behind when it syncs with
 * `conflict_strategy: "ask"`.
 *
 * Pure logic only — the MCP tools, the account UI and the confirm server
 * function all derive the same decisions, labels and file plan from it.
 */
import {
  keepBothPath,
  mergeContents,
  type ConflictKind,
} from "./conflicts";
import { getProvider, renderSkillFile, type ProviderScope, type SkillForRender } from "./providers";

export type ConflictDecision = "merge" | "overwrite" | "keep_both" | "skip";

export const DECISIONS: {
  id: ConflictDecision;
  label: string;
  short: string;
  description: string;
  needsLocalContent?: boolean;
}[] = [
  {
    id: "merge",
    label: "Merge",
    short: "Keep both edits",
    description:
      "Write the cloud version and preserve your local-only lines under a marked \u201cLocal additions\u201d section.",
    needsLocalContent: true,
  },
  {
    id: "overwrite",
    label: "Overwrite",
    short: "Cloud wins",
    description: "Replace the local file with the cloud version. Local edits at that path are lost.",
  },
  {
    id: "keep_both",
    label: "Keep both files",
    short: "Write alongside",
    description: "Leave the local file untouched and write the cloud version next to it with a -sak suffix.",
  },
  {
    id: "skip",
    label: "Skip",
    short: "Do nothing",
    description: "Leave this file exactly as it is. It stays out of this sync.",
  },
];

export function decisionMeta(id: string | null | undefined) {
  return DECISIONS.find((d) => d.id === id) ?? null;
}

export type PendingConflict = {
  id: string;
  provider: string;
  provider_label: string | null;
  scope: ProviderScope;
  slug: string;
  path: string;
  kind: ConflictKind;
  detail: string | null;
  local_lines: number | null;
  cloud_lines: number | null;
  local_only_lines: number | null;
  has_local_content: boolean;
  cloud_version: number | null;
  client_name: string | null;
  decision: ConflictDecision | null;
  status: "pending" | "decided" | "applied" | "dismissed";
  created_at: string;
  updated_at: string;
};

/** Decisions that can actually be executed for a given row. */
export function availableDecisions(c: Pick<PendingConflict, "has_local_content">) {
  return DECISIONS.filter((d) => !d.needsLocalContent || c.has_local_content);
}

/** A queue is only finishable once every open item has a decision. */
export function queueReady(items: Pick<PendingConflict, "decision">[]): boolean {
  return items.length > 0 && items.every((i) => !!i.decision);
}

export type ConflictGroup = {
  key: string;
  provider: string;
  label: string;
  scope: ProviderScope;
  items: PendingConflict[];
  decided: number;
  ready: boolean;
};

/** Group the queue by target (tool + scope) — the unit the user confirms. */
export function groupConflicts(items: PendingConflict[]): ConflictGroup[] {
  const map = new Map<string, ConflictGroup>();
  for (const item of items) {
    const key = `${item.provider}:${item.scope}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        provider: item.provider,
        label: item.provider_label ?? getProvider(item.provider)?.label ?? item.provider,
        scope: item.scope,
        items: [],
        decided: 0,
        ready: false,
      };
      map.set(key, g);
    }
    g.items.push(item);
  }
  for (const g of map.values()) {
    g.items.sort((a, b) => a.path.localeCompare(b.path));
    g.decided = g.items.filter((i) => !!i.decision).length;
    g.ready = queueReady(g.items);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label) || a.scope.localeCompare(b.scope));
}

export type PlannedFile = {
  slug: string;
  path: string;
  action: ConflictDecision;
  content: string;
};

export type PlanRow = {
  slug: string;
  path: string;
  decision: ConflictDecision | null;
  local_content?: string | null;
};

/**
 * Turn decided conflicts into the exact files to write. Skips are reported
 * separately so the confirmation screen can be honest about what it will not do.
 */
export function buildResolvedFiles(args: {
  providerId: string;
  scope: ProviderScope;
  rows: PlanRow[];
  skills: SkillForRender[];
}): { files: PlannedFile[]; skipped: { slug: string; path: string; reason: string }[] } {
  const provider = getProvider(args.providerId);
  const files: PlannedFile[] = [];
  const skipped: { slug: string; path: string; reason: string }[] = [];
  if (!provider) return { files, skipped };

  const bySlug = new Map(args.skills.map((s) => [s.slug, s]));

  for (const row of args.rows) {
    const skill = bySlug.get(row.slug);
    if (!skill) {
      skipped.push({ slug: row.slug, path: row.path, reason: "Skill is no longer in your cloud library." });
      continue;
    }
    const incoming = renderSkillFile(provider, skill);

    if (!row.decision || row.decision === "skip") {
      skipped.push({
        slug: row.slug,
        path: row.path,
        reason: row.decision === "skip" ? "You chose to skip this file." : "No decision was made.",
      });
      continue;
    }
    if (row.decision === "merge") {
      if (!row.local_content) {
        skipped.push({
          slug: row.slug,
          path: row.path,
          reason: "Merge needs the local file content, which was not captured. Choose overwrite or keep both.",
        });
        continue;
      }
      files.push({
        slug: row.slug,
        path: row.path,
        action: "merge",
        content: mergeContents(incoming, row.local_content),
      });
      continue;
    }
    if (row.decision === "keep_both") {
      files.push({ slug: row.slug, path: keepBothPath(row.path), action: "keep_both", content: incoming });
      continue;
    }
    files.push({ slug: row.slug, path: row.path, action: "overwrite", content: incoming });
  }

  return { files, skipped };
}
