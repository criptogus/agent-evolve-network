// Server-side core of the public certification API.
// Runs the same proprietary review engine as the `review_skill` MCP tool,
// records the result keyed by content hash, and hands back a badge the
// author can embed anywhere — even for skills never hosted on the registry.

import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeReview } from "@/lib/mcp/tools/skills";
import { inspectContent } from "@/lib/security/prompt-injection-guard";
import {
  CERTIFY_ENGINE_VERSION,
  type CertificationRecord,
  type CertifyRequest,
  sha256Hex,
} from "./core";

// external_certifications is newer than the generated Supabase types; the
// admin client is cast like the other API routes until types are regenerated.
const supabaseAdmin = _supabaseAdmin as any;

export interface CertifyResult {
  record: CertificationRecord;
  report: {
    verdict_score: number;
    structural_score: number;
    content_quality_score: number;
    top_actions: unknown[];
    input_warning: unknown;
    injection_findings: { severity: string; count: number };
  };
}

export async function certifyContent(req: CertifyRequest): Promise<CertifyResult> {
  // The guard never blocks a certification — a hostile file simply scores
  // what it scores — but findings are persisted so the verify endpoint can
  // surface them and the badge can't launder an injection attempt.
  const guard = inspectContent(req.content);

  const core = await computeReview({
    name: req.name,
    type: req.type,
    content: req.content,
    doc_class: "auto",
    semantic_check: true,
  });

  const content_sha256 = await sha256Hex(req.content);
  const verdict_score = Number(core.verdict_score ?? 0);
  const overall_score = Math.round(verdict_score);
  const grade = String(core.grade ?? "F — rewrite recommended");

  const { data, error } = await supabaseAdmin
    .from("external_certifications")
    .insert({
      name: req.name,
      type: req.type,
      content_sha256,
      overall_score,
      grade,
      engine_version: CERTIFY_ENGINE_VERSION,
      report: {
        structural_score: core.structural_score,
        content_quality_score: core.content_quality_score,
        doc_class: core.doc_class,
        language: core.language,
        input_warning: core.input_warning ?? null,
        guard: { severity: guard.severity, findings: guard.findings.length },
      },
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    throw new Error(`failed to persist certification: ${error?.message ?? "no row returned"}`);
  }

  return {
    record: {
      id: data.id,
      name: req.name,
      type: req.type,
      content_sha256,
      overall_score,
      grade,
      engine_version: CERTIFY_ENGINE_VERSION,
      created_at: data.created_at,
    },
    report: {
      verdict_score,
      structural_score: Number(core.structural_score ?? 0),
      content_quality_score: Number(core.content_quality_score ?? 0),
      top_actions: (core.top_actions as unknown[]) ?? [],
      input_warning: core.input_warning ?? null,
      injection_findings: { severity: guard.severity, count: guard.findings.length },
    },
  };
}

export async function getCertification(
  id: string,
): Promise<(CertificationRecord & { report: unknown }) | null> {
  const { data } = await supabaseAdmin
    .from("external_certifications")
    .select(
      "id, name, type, content_sha256, overall_score, grade, engine_version, report, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}
