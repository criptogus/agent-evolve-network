// Rug-pull detection (NVIDIA SkillSpector `--mcp-registry-compare` import).
//
// A rug pull is the attack where a package (or MCP server) keeps the SAME
// identity — slug, version, publisher — while its CONTENT silently changes
// after users already trusted it. Hashes and tool lists are the only visible
// difference, so a registry that only stores version strings cannot see it.
//
// Pure module: no I/O. Feed it the previously published snapshot and the
// candidate snapshot; it returns the machine-readable findings.

import { createHash } from "node:crypto";

export interface PackageSnapshot {
  slug: string;
  version: string;
  /** Stable hash of the full package payload (see packageContentHash). */
  content_sha256: string;
  /** Publisher/owner identity as displayed to users. */
  publisher?: string;
  /** Tool names an MCP server exposes (order-insensitive). */
  tools?: string[];
}

export type RugPullKind =
  "CONTENT_CHANGED_SAME_VERSION" | "TOOL_SET_CHANGED" | "PUBLISHER_CHANGED" | "VERSION_ROLLBACK";

export interface RugPullFinding {
  slug: string;
  version: string;
  kind: RugPullKind;
  severity: "critical" | "high";
  detail: string;
}

export interface RugPullReport {
  slug: string;
  /** True when at least one finding requires human review before install. */
  rug_pull: boolean;
  findings: RugPullFinding[];
}

/**
 * Deterministic JSON canonicalization: identical payloads hash identically
 * regardless of key insertion order. (Kept local so this module has no
 * dependency on the trust/signing keyring.)
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

export function packageContentHash(pkg: unknown): string {
  return createHash("sha256").update(canonicalJson(pkg)).digest("hex");
}

/** Semver-ish numeric comparison that is enough for rollback detection. */
function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.+-]/).map((x) => Number.parseInt(x, 10));
  const pb = b.split(/[.+-]/).map((x) => Number.parseInt(x, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = Number.isFinite(pa[i]) ? pa[i] : 0;
    const y = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (x !== y) return x - y;
  }
  return 0;
}

const normTools = (tools?: string[]): string[] =>
  [...new Set((tools ?? []).map((t) => t.trim()).filter(Boolean))].sort();

/**
 * Compare what was published with what is being offered now.
 *
 * - Same version + different content → critical rug pull (the exact attack).
 * - Same version + different tool set → high (MCP tools are capability, and a
 *   silently added `shell_exec` is a privilege escalation).
 * - Different publisher for an existing slug → high (ownership hijack).
 * - Version moved BACKWARDS → high (rollback attack / registry confusion).
 *
 * A legitimately new version with new content is NOT a finding — that is a
 * release, and its notes/history are the place to review it.
 */
export function detectRugPull(
  previous: PackageSnapshot,
  candidate: PackageSnapshot,
): RugPullReport {
  const findings: RugPullFinding[] = [];
  const slug = candidate.slug || previous.slug;

  if (previous.slug !== candidate.slug) {
    findings.push({
      slug,
      version: candidate.version,
      kind: "PUBLISHER_CHANGED",
      severity: "high",
      detail: `snapshot identity changed from "${previous.slug}" to "${candidate.slug}"`,
    });
  }

  if (
    previous.publisher != null &&
    candidate.publisher != null &&
    previous.publisher.trim().toLowerCase() !== candidate.publisher.trim().toLowerCase()
  ) {
    findings.push({
      slug,
      version: candidate.version,
      kind: "PUBLISHER_CHANGED",
      severity: "high",
      detail: `publisher changed from "${previous.publisher}" to "${candidate.publisher}" without a new slug`,
    });
  }

  const sameVersion = previous.version === candidate.version;
  if (sameVersion && previous.content_sha256 !== candidate.content_sha256) {
    findings.push({
      slug,
      version: candidate.version,
      kind: "CONTENT_CHANGED_SAME_VERSION",
      severity: "critical",
      detail:
        "content hash differs for an already-published version — " +
        "users who trusted this version would silently get different code",
    });
  }

  if (sameVersion) {
    const before = normTools(previous.tools);
    const after = normTools(candidate.tools);
    if (before.join("\n") !== after.join("\n")) {
      const added = after.filter((t) => !before.includes(t));
      const removed = before.filter((t) => !after.includes(t));
      findings.push({
        slug,
        version: candidate.version,
        kind: "TOOL_SET_CHANGED",
        severity: "high",
        detail:
          `tool surface changed for the same version` +
          (added.length ? ` — added: ${added.join(", ")}` : "") +
          (removed.length ? ` — removed: ${removed.join(", ")}` : ""),
      });
    }
  }

  if (compareVersions(candidate.version, previous.version) < 0) {
    findings.push({
      slug,
      version: candidate.version,
      kind: "VERSION_ROLLBACK",
      severity: "high",
      detail: `offered version ${candidate.version} is OLDER than published ${previous.version}`,
    });
  }

  return { slug, rug_pull: findings.length > 0, findings };
}
