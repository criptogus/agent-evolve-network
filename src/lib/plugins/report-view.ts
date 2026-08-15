import type { ConformanceReport } from "./conformance";

/** Wire-safe projection of a conformance report (no open-ended manifest maps). */
export function serializeReport(report: ConformanceReport) {
  return {
    conformant: report.conformant,
    failed: report.failed,
    warnings: report.warnings,
    plugin_name: report.manifest?.name ?? null,
    plugin_version: report.manifest?.version ?? null,
    checks: report.checks.map((c) => ({
      id: c.id,
      title: c.title,
      level: c.level,
      status: c.status,
      detail: c.detail,
    })),
    skills: report.skills.map((s) => ({
      dir: s.dir,
      name: s.name,
      description: s.description,
      bytes: s.bytes,
    })),
  };
}
