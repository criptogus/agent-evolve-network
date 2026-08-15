import { describe, it, expect } from "vitest";
import { summarizeSegments, segmentSignificance, pickVariantForSegment, segmentArmKey, VARIANTS } from "@/lib/crm/learning";

const rows = [
  { trigger: "cloud_library_upsell", variant: "v1", tool_id: "cursor", usage_pattern: "author", stats: { sent: 100, opened: 60, clicked: 30, converted: 20 } },
  { trigger: "cloud_library_upsell", variant: "v2", tool_id: "cursor", usage_pattern: "author", stats: { sent: 100, opened: 40, clicked: 10, converted: 2 } },
  { trigger: "cloud_library_upsell", variant: "v2", tool_id: "claude-code", usage_pattern: "reviewer", stats: { sent: 50, opened: 30, clicked: 20, converted: 15 } },
];

describe("segments", () => {
  it("rolls up by tool and picks a leader", () => {
    const t = summarizeSegments(rows as any, "tool");
    expect(t[0].key).toBe("cursor");
    expect(t[0].sent).toBe(200);
    expect(t[0].leader?.variant).toBe("v1");
    expect(segmentSignificance(t[0], 20).significant).toBe(true);
  });
  it("rolls up by pattern", () => {
    const p = summarizeSegments(rows as any, "pattern").map((g) => g.key);
    expect(p).toContain("reviewer");
  });
  it("prefers the segment winner", () => {
    const seg = { toolId: "cursor", pattern: "author" };
    const segStats: any = {};
    for (const r of rows) segStats[segmentArmKey(r.trigger, r.variant, { toolId: r.tool_id, pattern: r.usage_pattern })] = r.stats;
    let v1 = 0;
    for (let i = 0; i < 200; i++) {
      const d = pickVariantForSegment("cloud_library_upsell" as any, VARIANTS.cloud_library_upsell, {}, segStats, seg);
      if (d.variant === "v1") v1++;
    }
    expect(v1).toBeGreaterThan(150);
  });
});
