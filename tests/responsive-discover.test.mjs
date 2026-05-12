/**
 * Responsive layout regression tests for /discover.
 *
 * These tests parse src/routes/discover.tsx as source and assert that the
 * critical Tailwind utilities that keep the page usable at common mobile
 * widths (320, 360, 375, 390, 414 CSS px) remain present. They guard
 * against regressions on three responsive structures that previously broke:
 *
 *   1. The "Live · N packages" stats pill (must wrap, never overflow).
 *   2. The skill / playbook / soul / guardrail tab row (must scroll-x).
 *   3. The body grid (must stack below the `lg` breakpoint, 1024px).
 *
 * Run: node --test tests/responsive-discover.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(here, "../src/routes/discover.tsx"), "utf8");

const COMMON_MOBILE_WIDTHS = [320, 360, 375, 390, 414];
const TAILWIND_BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 };

/** Returns a window of source centered on `marker`. */
function windowAround(source, marker, before = 600, after = 1200) {
  const i = source.indexOf(marker);
  assert.ok(i >= 0, `marker not found: ${marker}`);
  return source.slice(Math.max(0, i - before), i + after);
}
const blockAfter = (source, marker, after = 1200) => windowAround(source, marker, 0, after);

test("page wrapper hides horizontal overflow on mobile", () => {
  // The outer min-h-screen wrapper must clip x-overflow so a stray child
  // (long pill text, wide tab row) cannot create a horizontal scrollbar
  // on the whole page at 320–414px.
  assert.match(
    SRC,
    /min-h-screen\s+overflow-x-hidden\s+bg-background/,
    "expected `min-h-screen overflow-x-hidden bg-background` on the root wrapper",
  );
});

test("stats pill wraps and keeps counts on a single line at mobile widths", () => {
  const block = windowAround(SRC, "Live · ", 800, 1500);
  // Pill container must wrap so it never forces horizontal scroll.
  assert.match(block, /flex-wrap/, "stats pill must use flex-wrap");
  // Each count uses whitespace-nowrap so "24 skills" never breaks mid-token.
  const nowrapCount = (block.match(/whitespace-nowrap/g) ?? []).length;
  assert.ok(
    nowrapCount >= 4,
    `expected ≥4 whitespace-nowrap counts in pill, got ${nowrapCount}`,
  );
  // Refresh button is pushed to the end and never shrinks.
  assert.match(block, /ml-auto[^"]*shrink-0/, "refresh button must be ml-auto + shrink-0");
});

test("primitive-type tab row scrolls horizontally on mobile", () => {
  // The 4-tab row (skills / playbooks / souls / guardrails) is too wide to
  // fit at 320px — it must overflow-x-auto and tabs must shrink-0.
  const block = windowAround(SRC, '"guardrail"] as Type[]).map', 600, 600);
  assert.match(block, /overflow-x-auto/, "tab row must be overflow-x-auto");
  assert.match(block, /shrink-0/, "tab buttons must use shrink-0");
});

test("results section allows children to truncate (min-w-0)", () => {
  // Without min-w-0, long card titles inside a CSS grid track blow out
  // the column width and cause page-level horizontal scroll on mobile.
  const block = blockAfter(SRC, "{/* Results */}", 400);
  assert.match(block, /<section className="min-w-0"/, "results <section> must be min-w-0");
});

test("body grid stacks below the lg breakpoint (covers all common mobile widths)", () => {
  // `lg:grid-cols-[220px_1fr]` means the 220px facet sidebar only appears at
  // ≥1024px. Below that — including every width in COMMON_MOBILE_WIDTHS —
  // the grid collapses to a single column. Assert both that this class is
  // present and that no smaller breakpoint forces a sidebar.
  assert.match(
    SRC,
    /grid\s+gap-6\s+lg:grid-cols-\[220px_1fr\]/,
    "body grid must use lg:grid-cols-[220px_1fr]",
  );
  assert.doesNotMatch(
    SRC,
    /(sm|md):grid-cols-\[220px_1fr\]/,
    "facet sidebar must not appear before the lg breakpoint",
  );

  for (const w of COMMON_MOBILE_WIDTHS) {
    assert.ok(
      w < TAILWIND_BREAKPOINTS.lg,
      `mobile width ${w}px should be below lg (${TAILWIND_BREAKPOINTS.lg}px) → grid stacks`,
    );
  }
});

test("vertical quick-filter chip row is horizontally scrollable", () => {
  // VerticalChip row sits above the cards and is always potentially wider
  // than the viewport once enough categories load.
  const block = blockAfter(SRC, "Vertical quick filter", 600);
  assert.match(block, /overflow-x-auto/, "vertical chip row must be overflow-x-auto");
});

test("filters bar is sticky on mobile and resets at lg", () => {
  // The search + type tabs container wraps the comment "Search + tabs".
  // On mobile it must stick to the top of the viewport so users can switch
  // skills/playbooks/souls/guardrails or refine the query without
  // scrolling back. At lg the facet sidebar takes over, so the bar reverts
  // to static positioning to avoid double chrome.
  const block = windowAround(SRC, "Search + tabs", 0, 800);
  assert.match(block, /sticky\s+top-0/, "filters bar must be sticky top-0 on mobile");
  assert.match(block, /z-30/, "filters bar must elevate above content (z-30)");
  assert.match(block, /backdrop-blur/, "filters bar must use backdrop-blur for legibility");
  assert.match(block, /lg:static/, "filters bar must reset to static at lg");
});
