import { z } from "zod";
export const EvidenceRowSchema = z
  .object({
    arm: z.enum(["control", "treatment"]),
    version: z.string().nullable(),
    model: z.string().nullable(),
    experiment_key: z.string().nullable(),
    executions: z.coerce.number().int().nonnegative(),
    measured: z.coerce.number().int().nonnegative(),
    completed: z.coerce.number().int().nonnegative(),
    avg_latency_ms: z.coerce.number().nonnegative().nullable(),
    total_tokens: z.coerce.number().nonnegative().nullable(),
  })
  .refine(
    (r) => r.completed <= r.measured && r.measured <= r.executions,
    "Inconsistent outcome counts",
  );
export type EvidenceRow = z.infer<typeof EvidenceRowSchema>;
function interval(passed: number, total: number) {
  if (!total) return null;
  const z = 1.96,
    p = passed / total,
    d = 1 + (z * z) / total,
    c = (p + (z * z) / (2 * total)) / d,
    h = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / d;
  return { low: Math.max(0, c - h), high: Math.min(1, c + h) };
}
export function compareEvidence(raw: unknown) {
  const rows = z.array(EvidenceRowSchema).parse(raw);
  const groups = new Map<
    string,
    {
      version: string | null;
      model: string | null;
      experiment: string | null;
      control?: EvidenceRow;
      treatment?: EvidenceRow;
    }
  >();
  for (const row of rows) {
    const key = JSON.stringify([row.version, row.model, row.experiment_key]);
    const g = groups.get(key) ?? {
      version: row.version,
      model: row.model,
      experiment: row.experiment_key,
    };
    if (g[row.arm]) throw new Error("Duplicate experiment arm");
    g[row.arm] = row;
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => {
    const c = g.control,
      t = g.treatment;
    const comparable = !!(g.experiment && g.version && g.model && c?.measured && t?.measured);
    return {
      ...g,
      comparable,
      control_interval: c ? interval(c.completed, c.measured) : null,
      treatment_interval: t ? interval(t.completed, t.measured) : null,
      completion_delta_pp:
        comparable && c && t ? 100 * (t.completed / t.measured - c.completed / c.measured) : null,
      latency_delta_ms:
        comparable && c?.avg_latency_ms != null && t?.avg_latency_ms != null
          ? t.avg_latency_ms - c.avg_latency_ms
          : null,
      reason: comparable
        ? "Matched version, model and experiment; observational, self-reported outcomes."
        : "Requires matching version, model, experiment and measured outcomes in both arms.",
    };
  });
}
