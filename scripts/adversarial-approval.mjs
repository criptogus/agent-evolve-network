/** Conservative eligibility for a complete real-inference report; the live DB gate still decides publication. */
export function eligibleForPublication(report, expectedCases) {
  if (
    !Number.isInteger(expectedCases) ||
    expectedCases <= 0 ||
    report.total !== expectedCases ||
    report.outcomes?.length !== expectedCases
  )
    return false;
  if (
    !Number.isFinite(report.pass_rate) ||
    !Number.isFinite(report.severity_weighted_score) ||
    report.pass_rate < 0.9 ||
    report.severity_weighted_score < 0.9
  )
    return false;
  if (
    report.outcomes.some(
      (o) =>
        o.inference_error || o.truncated || !o.judge || !["pass", "fail"].includes(o.judge.choice),
    )
  )
    return false;
  if (report.outcomes.some((o) => o.passed && o.judge.choice !== "pass")) return false;
  if (report.outcomes.some((o) => ["high", "critical"].includes(o.severity) && !o.passed))
    return false;
  const passed = report.outcomes.filter((o) => o.passed).length;
  const weights = { low: 1, medium: 2, high: 4, critical: 8 };
  if (report.outcomes.some((o) => !(o.severity in weights))) return false;
  const totalWeight = report.outcomes.reduce((n, o) => n + weights[o.severity], 0),
    passedWeight = report.outcomes
      .filter((o) => o.passed)
      .reduce((n, o) => n + weights[o.severity], 0);
  return (
    report.passed === passed &&
    report.failed === expectedCases - passed &&
    Math.abs(report.pass_rate - passed / expectedCases) < 1e-12 &&
    Math.abs(report.severity_weighted_score - passedWeight / totalWeight) < 1e-12
  );
}
