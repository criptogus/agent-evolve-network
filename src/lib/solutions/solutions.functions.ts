import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SOLUTIONS, planSolution } from "./catalog";
import expansion from "../../../content/expansion/skills.json";
export const getSolutions = createServerFn({ method: "GET" }).handler(async () => {
  const slugs = [
    ...new Set([...SOLUTIONS.flatMap((s) => s.packages), ...expansion.map((s) => s.slug)]),
  ];
  const { data, error } = await supabaseAdmin
    .from("packages")
    .select("slug,name,latest_version")
    .in("slug", slugs)
    .eq("is_published", true)
    .eq("review_status", "approved")
    .eq("price_credits", 0);
  if (error) throw new Error("Unable to check solution availability");
  return {
    available: data ?? [],
    candidates: expansion.map((s) => ({
      slug: s.slug,
      name: s.name,
      category: s.category,
      description: s.procedure.split(". ")[0],
    })),
  };
});
export const downloadSolution = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string(), budget: z.number().int().min(1).max(20) }).parse(d),
  )
  .handler(async ({ data }) => {
    const solution = SOLUTIONS.find((s) => s.id === data.id);
    if (!solution) throw new Error("Unknown solution");
    const plan = planSolution(solution, data.budget);
    if (!plan.within_budget) throw new Error("The stack exceeds its selected context budget");
    const { loadPluginPackage } = await import("@/lib/plugins/package.server");
    const loaded = await Promise.all(plan.packages.map((slug) => loadPluginPackage(slug)));
    if (loaded.some((p) => !p))
      throw new Error(
        "Every package must be publicly approved before this solution can be downloaded",
      );
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const lock = loaded.flatMap((p) => (p ? [{ slug: p.slug, version: p.manifest.version }] : []));
    zip.file("solution.json", JSON.stringify({ ...plan, locked_packages: lock }, null, 2));
    zip.file(
      "README.md",
      `# ${solution.title}\n\n${solution.outcome}\n\nEach packages/ directory contains a complete portable package. Review scripts and permissions before installing. Follow solution.json in dependency order; load only the packages needed for the current step. External actions remain subject to owner authorization.\n`,
    );
    for (const pkg of loaded)
      if (pkg) for (const [path, body] of pkg.files) zip.file(`packages/${pkg.slug}/${path}`, body);
    const bytes = await zip.generateAsync({ type: "base64" });
    return { base64: bytes, filename: `${solution.id}.zip`, locked_packages: lock };
  });
