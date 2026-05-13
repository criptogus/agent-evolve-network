// Renders shields.io-style SVG badges for package trust scores.
// Embeddable in READMEs and PR comments — every impression is a backlink.

import { badgeColor } from "../trust/score.ts";

const COLOR_HEX: Record<string, string> = {
  green: "#2ea043",
  yellow: "#d4a72c",
  orange: "#fb8500",
  red: "#cf222e",
  gray: "#586069",
};

export interface BadgeInput {
  slug: string;
  score?: number | null;
  /** Optional override label (default: "trust score"). */
  label?: string;
}

export function renderTrustBadge(b: BadgeInput): string {
  const label = b.label ?? "trust score";
  const hasScore = typeof b.score === "number" && Number.isFinite(b.score);
  const valueText = hasScore ? `${(b.score! * 100).toFixed(0)}%` : "—";
  const color = hasScore ? COLOR_HEX[badgeColor(b.score!)] : COLOR_HEX.gray;
  return svg(label, valueText, color);
}

export function renderAdversarialBadge(opts: { vertical?: string; pass_rate?: number | null }): string {
  const label = `adversarial${opts.vertical ? `:${opts.vertical}` : ""}`;
  const has = typeof opts.pass_rate === "number" && Number.isFinite(opts.pass_rate);
  const valueText = has ? `${(opts.pass_rate! * 100).toFixed(0)}%` : "—";
  const color = has
    ? (opts.pass_rate! >= 0.9 ? COLOR_HEX.green
      : opts.pass_rate! >= 0.75 ? COLOR_HEX.yellow
      : opts.pass_rate! >= 0.5 ? COLOR_HEX.orange
      : COLOR_HEX.red)
    : COLOR_HEX.gray;
  return svg(label, valueText, color);
}

// Minimal shields.io-shaped badge — no external font needed.
function svg(label: string, value: string, color: string): string {
  const labelW = textWidth(label) + 10;
  const valueW = textWidth(value) + 10;
  const totalW = labelW + valueW;
  const labelX = (labelW / 2) * 10;
  const valueX = (labelW + valueW / 2) * 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
<title>${esc(label)}: ${esc(value)}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
  <rect width="${labelW}" height="20" fill="#555"/>
  <rect x="${labelW}" width="${valueW}" height="20" fill="${color}"/>
  <rect width="${totalW}" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
  <text aria-hidden="true" x="${labelX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${textWidth(label) * 10}">${esc(label)}</text>
  <text x="${labelX}" y="140" transform="scale(.1)" textLength="${textWidth(label) * 10}">${esc(label)}</text>
  <text aria-hidden="true" x="${valueX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${textWidth(value) * 10}">${esc(value)}</text>
  <text x="${valueX}" y="140" transform="scale(.1)" textLength="${textWidth(value) * 10}">${esc(value)}</text>
</g>
</svg>`;
}

function textWidth(s: string): number {
  // Approximate: 6.5 px per char for Verdana at 11px. Good enough for badges.
  return Math.max(20, Math.round(s.length * 6.5));
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
