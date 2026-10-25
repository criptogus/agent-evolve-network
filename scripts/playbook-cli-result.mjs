/** Decode process output without repairing, completing or trimming a response. */
export function decodePlaybookCliResult(stdout, exitCode) {
  let value;
  try {
    value = JSON.parse(stdout);
  } catch {
    return { value: null, error: "invalid_stdout_json" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { value: null, error: "invalid_result_shape" };
  if (
    exitCode === 0 &&
    (value.status !== "ok" || !Array.isArray(value.step_outcomes) || !value.step_outcomes.length)
  )
    return { value, error: "success_without_complete_graph" };
  return { value, error: null };
}
