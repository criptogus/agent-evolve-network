/**
 * Line diff for the pending-conflict preview.
 *
 * Pure logic, no DOM: produces side-by-side rows (local vs cloud) plus counts
 * so the account UI can show exactly which lines diverge before the user picks
 * a sync strategy.
 */

export type DiffOp = "same" | "added" | "removed" | "changed";

export type DiffRow = {
  op: DiffOp;
  /** 1-based line number in the local file, null when the line only exists in the cloud. */
  leftNo: number | null;
  /** 1-based line number in the cloud file, null when the line only exists locally. */
  rightNo: number | null;
  left: string | null;
  right: string | null;
};

export type DiffStats = {
  same: number;
  added: number;
  removed: number;
  changed: number;
  /** Any difference at all. */
  total: number;
};

const MAX_LINES = 4000;

function splitLines(input: string): string[] {
  return input.replace(/\r\n?/g, "\n").split("\n").slice(0, MAX_LINES);
}

/** Longest-common-subsequence table over lines, then walked back into rows. */
function lcsRows(a: string[], b: string[]): DiffRow[] {
  const n = a.length;
  const m = b.length;
  // dp[i][j] = LCS length of a[i..] and b[j..]
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ op: "same", leftNo: i + 1, rightNo: j + 1, left: a[i], right: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ op: "removed", leftNo: i + 1, rightNo: null, left: a[i], right: null });
      i++;
    } else {
      rows.push({ op: "added", leftNo: null, rightNo: j + 1, left: null, right: b[j] });
      j++;
    }
  }
  while (i < n) {
    rows.push({ op: "removed", leftNo: i + 1, rightNo: null, left: a[i], right: null });
    i++;
  }
  while (j < m) {
    rows.push({ op: "added", leftNo: null, rightNo: j + 1, left: null, right: b[j] });
    j++;
  }
  return rows;
}

/**
 * Pair adjacent removed/added runs so a modified line shows side by side
 * instead of as two separate rows.
 */
function pairRuns(rows: DiffRow[]): DiffRow[] {
  const out: DiffRow[] = [];
  let k = 0;
  while (k < rows.length) {
    if (rows[k].op !== "removed") {
      out.push(rows[k]);
      k++;
      continue;
    }
    const removed: DiffRow[] = [];
    while (k < rows.length && rows[k].op === "removed") removed.push(rows[k++]);
    const added: DiffRow[] = [];
    while (k < rows.length && rows[k].op === "added") added.push(rows[k++]);

    const max = Math.max(removed.length, added.length);
    for (let x = 0; x < max; x++) {
      const l = removed[x];
      const r = added[x];
      if (l && r) {
        out.push({ op: "changed", leftNo: l.leftNo, rightNo: r.rightNo, left: l.left, right: r.right });
      } else if (l) {
        out.push(l);
      } else if (r) {
        out.push(r);
      }
    }
  }
  return out;
}

/** Side-by-side diff rows: left = local file on disk, right = cloud version. */
export function diffLines(localContent: string, cloudContent: string): DiffRow[] {
  return pairRuns(lcsRows(splitLines(localContent), splitLines(cloudContent)));
}

export function diffStats(rows: DiffRow[]): DiffStats {
  const s: DiffStats = { same: 0, added: 0, removed: 0, changed: 0, total: 0 };
  for (const r of rows) s[r.op]++;
  s.total = s.added + s.removed + s.changed;
  return s;
}

/**
 * Collapse long runs of identical lines, keeping `context` lines around each
 * change. Returned gaps let the UI render a "N unchanged lines" separator.
 */
export type DiffChunk = { type: "rows"; rows: DiffRow[] } | { type: "gap"; hidden: number };

export function collapseUnchanged(rows: DiffRow[], context = 3): DiffChunk[] {
  const keep = new Array(rows.length).fill(false);
  rows.forEach((r, i) => {
    if (r.op === "same") return;
    for (let k = Math.max(0, i - context); k <= Math.min(rows.length - 1, i + context); k++) keep[k] = true;
  });

  const chunks: DiffChunk[] = [];
  let i = 0;
  while (i < rows.length) {
    if (keep[i]) {
      const run: DiffRow[] = [];
      while (i < rows.length && keep[i]) run.push(rows[i++]);
      chunks.push({ type: "rows", rows: run });
    } else {
      let hidden = 0;
      while (i < rows.length && !keep[i]) {
        hidden++;
        i++;
      }
      chunks.push({ type: "gap", hidden });
    }
  }
  return chunks;
}
