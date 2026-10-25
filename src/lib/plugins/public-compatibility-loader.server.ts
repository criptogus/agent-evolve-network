/** Shared read-only evidence loader for public metadata and marketplace pages. */
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { publicCompatibility } from "./public-compatibility.server";
export async function loadPublicEvaluationCompatibility(
  packageId: string,
  version: {
    id: string;
    version: string;
    system_prompt: string;
    compatibility: unknown;
  },
): Promise<unknown> {
  const [compat, latestRun, artifact] = await Promise.all([
    supabaseAdmin
      .from("skill_compatibility")
      .select("package_id,version,model,status,pass_rate,total_cases,passed_cases")
      .eq("package_id", packageId)
      .eq("version", version.version),
    supabaseAdmin
      .from("adversarial_runs")
      .select(
        "package_id,version_id,model,total,passed,failed,pass_rate,severity_weighted_score,by_severity,outcomes",
      )
      .eq("package_id", packageId)
      .eq("version_id", version.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("package_artifacts")
      .select("sha256")
      .eq("version_id", version.id)
      .maybeSingle(),
  ]);
  return !compat.error && !latestRun.error && !artifact.error && artifact.data
    ? publicCompatibility(version.compatibility, compat.data, latestRun.data, {
        packageId,
        versionId: version.id,
        version: version.version,
        promptSha256: createHash("sha256").update(version.system_prompt).digest("hex"),
        archiveSha256: artifact.data.sha256,
      })
    : (version.compatibility ?? []);
}
