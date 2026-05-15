import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { hashToken } from "@/lib/account/tokens.server";
import { processBulkUpload } from "@/lib/uploads/uploads.server";

const json = (v: unknown) => JSON.stringify(v, null, 2);

async function resolveUserFromToken(token: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("mcp_tokens")
    .select("user_id,id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data) return null;
  // best-effort touch last_used_at
  await supabaseAdmin.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data.user_id;
}

export const overviewTool = defineTool({
  name: "overview",
  description:
    "START HERE if unsure. Returns the SuperAgentSkill toolkit map grouped by user intent (UPGRADE a local file / DISCOVER registry primitives / PUBLISH back to registry), the auth model, and the canonical workflows. Cheap, read-only, no auth.",
  parameters: z.object({}),
  execute: async () =>
    json({
      server: "superagentskill",
      version: "1.5.0",
      tagline:
        "Battle-tested toolkit for designing, auditing and shipping AI primitives — skills, playbooks, souls, guardrails.",
      intents: {
        upgrade_local_file: {
          description:
            "PRIMARY use case. The user has a local skill/playbook/soul/guardrail file and wants it significantly improved against the SuperAgentSkill methodology.",
          workflow: [
            "1. review_skill     — proprietary engine scores the file (0-100 overall + per-dimension) and returns concrete, file-specific top_actions.",
            "2. <host edits>     — YOU apply top_actions in the user's repo.",
            "3. review_skill     — confirm the score went up. Iterate to grade A.",
            "4. search_registry  — (optional) borrow patterns from high-trust primitives.",
            "(get_methodology is orientation only — the rubric/signals are server-side and not disclosed.)",
          ],
          tools: ["get_methodology", "review_skill", "search_registry", "get_package"],
        },
        discover_registry: {
          description:
            "Find or install pre-built primitives from the public registry (590+ packages: marketing, sales, growth, code, security, healthcare, finance, ops, …).",
          workflow: [
            "1. search_registry   — free-text across name + description + long_description, ordered by install_count.",
            "2. get_package       — full latest manifest (system_prompt, rules, examples, compatibility).",
            "3. get_skill_trust   — success rate, latency, per-model heatmap, robustness findings, trust_score. Call BEFORE recommending.",
            "4. report_execution  — (after the user runs it) feed the trust system. Best-effort.",
          ],
          tools: ["search_registry", "list_packages", "get_package", "get_skill_trust", "report_execution"],
        },
        publish_back: {
          description:
            "Push a local primitive upward to the registry so others (and future-you) benefit. Requires OAuth.",
          workflow: [
            "1. upload_packages   — bulk upload markdown/prompt/JSON files. Normalised by SkillForge into draft packages. Pass publish:true to publish immediately.",
            "2. request_primitive — ask SuperAgentSkill to AUTHOR a brand-new primitive from scratch via the forge pipeline.",
          ],
          tools: ["upload_packages", "request_primitive"],
        },
      },
      primitive_types: {
        skill: "A focused capability the agent can invoke (e.g. 'write-cold-outreach', 'audit-rls-policies').",
        playbook: "A multi-step procedure / runbook the agent follows end-to-end.",
        soul: "Persona + values + voice + refusals (the 'who', not the 'what').",
        guardrail: "A safety / quality constraint enforced before, during or after another primitive runs.",
      },
      auth: {
        anonymous_ok: ["overview", "get_methodology", "review_skill", "search_registry", "list_packages", "get_package", "get_skill_trust"],
        oauth_required: ["upload_packages", "request_primitive", "report_execution"],
        oauth_endpoint: "https://superagentskill.com/oauth/authorize",
      },
      docs: "https://superagentskill.com/connect",
    }),
});

export const listPackagesTool = defineTool({
  name: "list_packages",
  description:
    "[DISCOVER] Browse published primitives by `type`. Always pass `query` to scope by domain — the registry has 590+ packages and listing without a query is biased toward the most-installed vertical. Prefer `search_registry` when scoping by topic. Read-only, no auth.",
  parameters: z.object({
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
    query: z
      .string()
      .optional()
      .describe(
        "Free-text filter over name + description + long_description (case-insensitive). Use a domain keyword like 'marketing', 'sales', 'growth', 'design', 'security' to narrow the 590+ packages.",
      ),
    limit: z.number().int().min(1).max(200).default(50),
  }),
  execute: async ({ type, query, limit }) => {
    let q = supabaseAdmin
      .from("packages")
      .select("slug,name,type,description,latest_version,author_handle,install_count")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .order("install_count", { ascending: false })
      .order("name", { ascending: true })
      .limit(limit);
    if (type) q = q.eq("type", type);
    if (query) {
      const safe = query.replace(/[%,()]/g, " ").trim();
      if (safe) {
        q = q.or(
          `name.ilike.%${safe}%,description.ilike.%${safe}%,long_description.ilike.%${safe}%`,
        );
      }
    }
    const { data, error } = await q;
    if (error) return json({ error: error.message });
    return json({
      count: data?.length ?? 0,
      hint:
        (data?.length ?? 0) >= limit
          ? "More results available — increase `limit` (max 200) or refine `query`."
          : !query
            ? "No `query` was passed. Pass a domain keyword (e.g. 'marketing') to scope the search — listing the whole registry will skew toward whichever vertical has the most installs."
            : undefined,
      items: data ?? [],
    });
  },
});

export const getPackageTool = defineTool({
  name: "get_package",
  description:
    "[DISCOVER] Fetch the full latest-version manifest of a primitive by slug: system_prompt, rules, examples, compatibility. Use AFTER search_registry/list_packages found a candidate. Read-only, no auth.",
  parameters: z.object({
    slug: z.string().describe("Package slug (e.g. cardiology-soul)"),
  }),
  execute: async ({ slug }) => {
    const { data: pkg, error } = await supabaseAdmin
      .from("packages")
      .select("id,slug,name,type,description,long_description,latest_version,author_handle")
      .eq("slug", slug)
      .eq("is_published", true)
      .eq("review_status", "approved")
      .maybeSingle();
    if (error) return json({ error: error.message });
    if (!pkg) return json({ error: "not_found" });
    const { data: ver } = await supabaseAdmin
      .from("package_versions")
      .select("version,status,system_prompt,rules,examples,compatibility,notes")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return json({ package: pkg, version: ver });
  },
});

export const searchRegistryTool = defineTool({
  name: "search_registry",
  description:
    "[DISCOVER] PRIMARY discovery tool. Free-text search across name + description + long_description. Use whenever the user asks for a domain, capability or persona ('marketing skills', 'copywriter for landing pages', 'something to harden RLS'). Returns up to 50 hits ordered by install_count desc. Prefer this over list_packages — it sees descriptions, not just names. Read-only, no auth.",
  parameters: z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(50).default(20),
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
  }),
  execute: async ({ query, limit, type }) => {
    const safe = query.replace(/[%,()]/g, " ").trim();
    let q = supabaseAdmin
      .from("packages")
      .select("slug,name,type,description,latest_version,install_count")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .or(`name.ilike.%${safe}%,description.ilike.%${safe}%,long_description.ilike.%${safe}%`)
      .order("install_count", { ascending: false })
      .limit(limit);
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) return json({ error: error.message });
    return json({ query, count: data?.length ?? 0, items: data ?? [] });
  },
});

export const requestPrimitiveTool = defineTool({
  name: "request_primitive",
  description:
    "[PUBLISH] Submit a request for a primitive that does not yet exist. SuperAgentSkill researches and auto-creates it via the proprietary forge pipeline. Requires OAuth.",
  parameters: z.object({
    type: z.enum(["skill", "playbook", "soul", "guardrail"]),
    brief: z.string().min(20).max(2000).describe("What the primitive should do, with industry/context"),
    industry: z.string().max(80).optional(),
  }),
  execute: async ({ type, brief, industry }) => {
    const { data, error } = await supabaseAdmin
      .from("package_requests")
      .insert({ kind: type, brief, industry: industry ?? null, status: "queued" })
      .select("id,status")
      .single();
    if (error) return json({ error: error.message });
    return json({
      request_id: data.id,
      status: data.status,
      note: "Queued for the Super Agent Skill forge pipeline.",
    });
  },
});

export const reportExecutionTool = defineTool({
  name: "report_execution",
  description:
    "[DISCOVER/TRUST] Report an execution of a SuperAgentSkill primitive after the user runs it in production → feeds the public trust score, model heatmap and battle-tested badge. Anonymous calls accepted (pass an opaque agent_fp for rate limiting). Best-effort: call after each run and ignore failures.",
  parameters: z.object({
    slug: z.string().min(1),
    success: z.boolean(),
    model: z.string().max(80).optional().describe("e.g. claude-sonnet-4-5, gpt-5, gemini-2.5-pro"),
    version: z.string().max(40).optional(),
    latency_ms: z.number().int().min(0).max(10 * 60 * 1000).optional(),
    tokens_in: z.number().int().min(0).max(2_000_000).optional(),
    tokens_out: z.number().int().min(0).max(2_000_000).optional(),
    error_kind: z.string().max(80).optional().describe("Short tag like timeout, refusal, hallucination, tool_error"),
    agent_fp: z.string().max(128).optional().describe("Opaque per-agent fingerprint hash for rate limiting"),
  }),
  execute: async (input) => {
    const { data, error } = await supabaseAdmin.rpc("report_skill_execution", {
      _slug: input.slug,
      _success: input.success,
      _model: input.model,
      _version: input.version,
      _latency_ms: input.latency_ms,
      _tokens_in: input.tokens_in,
      _tokens_out: input.tokens_out,
      _error_kind: input.error_kind,
      _agent_fp: input.agent_fp,
    } as any);
    if (error) return json({ ok: false, error: error.message });
    return json({ ok: true, execution_id: data });
  },
});

export const getTrustTool = defineTool({
  name: "get_skill_trust",
  description:
    "[DISCOVER] Public Trust Report for a primitive: lifetime / 30d / 7d success rate, p50/p95 latency, per-model heatmap, robustness findings (CVE-style) and composite trust_score (0-100). ALWAYS call this BEFORE recommending or installing a registry primitive. Read-only, no auth.",
  parameters: z.object({ slug: z.string().min(1) }),
  execute: async ({ slug }) => {
    const { data, error } = await supabaseAdmin.rpc("get_skill_trust", { _slug: slug });
    if (error) return json({ error: error.message });
    if (!data) return json({ error: "not_found" });
    const { data: findings } = await supabaseAdmin
      .from("skill_robustness_findings")
      .select("code,severity,category,summary,fixed_in_version,published_at")
      .eq("package_slug", slug)
      .eq("status", "public")
      .order("published_at", { ascending: false })
      .limit(20);
    return json({ trust: data, findings: findings ?? [] });
  },
});

export const uploadPackagesTool = defineTool({
  name: "upload_packages",
  description:
    "[PRIVATE UPLOAD] Push local primitive(s) into the author's PRIVATE workspace. Files are normalised by the SkillForge author pipeline and stored as private drafts owned by the token holder — NOT visible in the public marketplace, search, or trust leaderboard. To list a draft for sale on the marketplace, the author must explicitly publish it from the website UI (/account/packages). This MCP tool intentionally has no `publish` parameter so agents cannot expose a user's skill publicly without their consent. Authenticates via the OAuth bearer of the active MCP session — no extra personal token needed.",
  parameters: z.object({
    files: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          content: z.string().min(20).max(120_000),
          type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
        })
      )
      .min(1)
      .max(10),
    auth_token: z
      .string()
      .min(8)
      .optional()
      .describe("Deprecated. Ignored when the request already carries an OAuth bearer; only used as a fallback for legacy personal MCP tokens."),
  }),
  execute: async ({ auth_token, files }, ctx) => {
    const sessionUserId = (ctx?.auth?.claims as { user_id?: string } | undefined)?.user_id ?? null;
    const userId = sessionUserId ?? (auth_token ? await resolveUserFromToken(auth_token) : null);
    if (!userId)
      return json({
        error: "unauthorized",
        hint: "Connect via OAuth (the host opens https://superagentskill.com/oauth/authorize automatically) — no personal token needed.",
      });
    try {
      // Always private. Marketplace listing requires an explicit user action in the UI.
      const results = await processBulkUpload(supabaseAdmin as any, userId, files, { publish: false });
      const ok = results.filter((r) => r.ok).length;
      return json({
        uploaded: ok,
        failed: results.length - ok,
        visibility: "private_draft",
        next_step: "Open /account/packages on superagentskill.com to list a draft on the marketplace.",
        results,
      });
    } catch (e: any) {
      return json({ error: e?.message ?? "upload_failed" });
    }
  },
});

// ============================================================================
// Methodology + local-skill review
// ----------------------------------------------------------------------------
// PRIMARY value of this MCP server: help an external agent (Claude, Codex, …)
// significantly upgrade a *local* skill / playbook / soul / guardrail using
// the Super Agent Skill methodology. Discovery / download is secondary.
// ============================================================================

// ----------------------------------------------------------------------------
// SECRET SAUCE — proprietary evaluation engine.
//
// Design rule: this module NEVER ships its rubric, its detection signals, its
// weights, or per-check pass/fail booleans over the wire. Exposing those once
// would let any model internalise the evaluator and stop coming back. The MCP
// surface returns only: a number, a band, and outcome-level directives that
// describe WHAT to improve for THIS file — never HOW we measured it.
//
// Everything between this banner and the tool exports is server-private.
// ----------------------------------------------------------------------------

const ENGINE = "sas-eval/3";

type PillarId =
  | "identity"
  | "scope"
  | "procedure"
  | "examples"
  | "guardrails"
  | "trust"
  | "portability";

const PILLAR_TITLE: Record<PillarId, string> = {
  identity: "Identity",
  scope: "Scope & Triggers",
  procedure: "Procedure",
  examples: "Examples",
  guardrails: "Guardrails",
  trust: "Trust hooks",
  portability: "Portability",
};

const TYPE_WEIGHTS: Record<string, Partial<Record<PillarId, number>>> = {
  skill: { identity: 1, scope: 1.2, procedure: 1.3, examples: 1.3, guardrails: 1.1, trust: 1, portability: 0.9 },
  playbook: { identity: 0.8, scope: 1.1, procedure: 1.8, examples: 1.2, guardrails: 1.1, trust: 1, portability: 0.8 },
  soul: { identity: 2, scope: 0.8, procedure: 0.6, examples: 0.9, guardrails: 1.2, trust: 0.9, portability: 0.9 },
  guardrail: { identity: 0.7, scope: 1, procedure: 1, examples: 1, guardrails: 2, trust: 1.1, portability: 0.9 },
};

// Each signal is bilingual (EN + PT-BR alternates) so non-English docs are not
// silently zeroed. `kind`: "positive" = presence improves score; "negative" =
// presence is a penalty (e.g. vendor lock-in for portability).
type Signal = {
  w: number;
  kind: "positive" | "negative";
  primary: RegExp;
  secondary?: RegExp;
};

// Multilingual signals: EN + PT + ES + FR + DE + IT alternates so non-English
// docs are not silently zeroed. Add new languages by appending alternates here.
const SIGNALS: Record<PillarId, Signal[]> = {
  identity: [
    { w: 1, kind: "positive", primary: /\b(you are|role:|persona:|act as|você é|papel:|atue como|eres|tú eres|actúa como|rol:|tu es|agis comme|rôle:|du bist|handle als|rolle:|sei un|agisci come|ruolo:)\b/i, secondary: /\b(assistant|agent that|assistente|agente que|asistente|agente que|assistant|agent qui|assistent|agent der|assistente|agente che)\b/i },
    { w: 1, kind: "positive", primary: /\b(values?:|principles?:|cares? about|believe|valores?:|princípios?:|acredita|valores:|principios:|cree|valeurs:|principes:|croit|werte:|prinzipien:|glaubt|valori:|principi:|crede)\b/i, secondary: /\b(prioriti[sz]e|stands? for|prioriza|prioriza|prioritiser|priorisier|prioritizz)/i },
    { w: 0.8, kind: "positive", primary: /\b(voice|tone|writing style|voz|tom|estilo de escrita|voz|tono|estilo|voix|ton|style|stimme|tonfall|stil|voce|tono|stile)\b/i, secondary: /\b(concise|formal|friendly|conciso|amigável|conciso|amistoso|concis|amical|prägnant|freundlich|conciso|amichevole)/i },
    { w: 1, kind: "positive", primary: /\b(non-goals?|will not|won't|out of scope|não-objetivos?|não fará|fora de escopo|no-objetivos|fuera de alcance|hors[- ]périmètre|nicht[- ]ziele|außerhalb|fuori ambito|non[- ]obiettivi)\b/i, secondary: /\b(never|avoid|nunca|evita|nunca|evitar|jamais|éviter|niemals|vermeiden|mai|evitare)/i },
    { w: 1, kind: "positive", primary: /\b(refus|decline|cannot help|won't assist|recus|negar|não pode ajudar|rechaz|negar|no puede ayudar|refus|décline|ne peut aider|verweiger|ablehn|kann nicht helfen|rifiut|declin|non può aiutare)/i, secondary: /\b(escalate|hand off|escala|encaminha|escalar|derivar|escalader|transmettre|eskalier|weiterleiten|inoltr|trasferi)/i },
  ],
  scope: [
    { w: 1.2, kind: "positive", primary: /\b(use when|use this when|job:|purpose:|when to use|use quando|propósito:|quando usar|usar cuando|propósito:|cuándo usar|utiliser quand|but:|quand utiliser|verwenden wenn|zweck:|wann verwenden|usare quando|scopo:|quando usare)\b/i, secondary: /\b(applies to|aplica-se a|aplica a|s'applique à|gilt für|si applica a)/i },
    { w: 1, kind: "positive", primary: /\b(trigger|invoke|activate when|gatilho|acionar|ativar quando|disparador|activar cuando|déclencheur|activer quand|auslöser|aktivieren wenn|trigger|attivare quando)\b/i, secondary: /\b(when the user|quando o usuário|cuando el usuario|quand l'utilisateur|wenn der nutzer|quando l'utente)/i },
    { w: 1, kind: "positive", primary: /\b(anti-trigger|do not use|skip when|not for|anti-gatilho|não usar|pular quando|não para|no usar|saltar cuando|ne pas utiliser|sauter quand|nicht verwenden|überspringen wenn|non usare|saltare quando)\b/i, secondary: /\b(unless|except when|a menos que|exceto quando|a menos que|excepto cuando|sauf si|à moins que|es sei denn|außer wenn|a meno che|tranne quando)/i },
    { w: 0.8, kind: "positive", primary: /\b(target user|audience|intended for|público-alvo|audiência|destinado a|usuario objetivo|audiencia|destinado a|utilisateur cible|public|destiné à|zielgruppe|nutzer|bestimmt für|utente target|pubblico|destinato a)/i, secondary: /\b(role of the user|papel do usuário|rol del usuario|rôle de l'utilisateur|rolle des nutzers|ruolo dell'utente)/i },
  ],
  procedure: [
    { w: 1.4, kind: "positive", primary: /^\s*\d+[.)]/m, secondary: /^\s*[-*] /m },
    { w: 1.1, kind: "positive", primary: /\b(input:|output:|success:|done when|entrada:|saída:|sucesso:|pronto quando|entrada:|salida:|éxito:|hecho cuando|entrée:|sortie:|succès:|terminé quand|eingabe:|ausgabe:|erfolg:|fertig wenn|ingresso:|uscita:|successo:|fatto quando)|✓/i, secondary: /\b(returns?:|produces?:|retorna:|devuelve:|retourne:|gibt zurück:|restituisce:)/i },
    { w: 1, kind: "positive", primary: /\b(if .*(then|→)|otherwise|else if|branch|fork|se .*(então|→)|caso contrário|senão|si .*(entonces|→)|de lo contrario|si .*(alors|→)|sinon|wenn .*(dann|→)|sonst|se .*(allora|→)|altrimenti)/i, secondary: /\b(case|depending on|caso|dependendo|caso|dependiendo|cas|selon|fall|abhängig|caso|a seconda)/i },
    { w: 1, kind: "positive", primary: /\b(stop when|definition of done|finish when|terminate|parar quando|definição de pronto|finalizar quando|parar cuando|definición de hecho|terminar cuando|arrêter quand|définition de terminé|finir quand|stoppen wenn|definition fertig|beenden wenn|fermare quando|definizione di fatto|finire quando)/i, secondary: /\b(until|até|hasta|jusqu'à|bis|finché)/i },
  ],
  examples: [
    { w: 1.3, kind: "positive", primary: /\b(example|sample|worked|walkthrough|exemplo|amostra|passo a passo|ejemplo|muestra|paso a paso|exemple|échantillon|pas à pas|beispiel|muster|schritt für schritt|esempio|campione|passo passo)/i, secondary: /\b(e\.g\.|for instance|por exemplo|por ejemplo|par exemple|zum beispiel|z\.b\.|ad esempio)/i },
    { w: 1.2, kind: "positive", primary: /\b(bad example|anti-example|wrong:|fails when|counter-?example|exemplo ruim|errado:|falha quando|contra-?exemplo|mal ejemplo|incorrecto:|falla cuando|contra-?ejemplo|mauvais exemple|incorrect:|échoue quand|contre-?exemple|schlechtes beispiel|falsch:|scheitert wenn|gegenbeispiel|esempio sbagliato|errato:|fallisce quando|controesempio)|❌/i, secondary: /\b(pitfall|mistake|armadilha|erro comum|trampa|error común|piège|erreur|fallstrick|fehler|insidia|errore)/i },
    { w: 1, kind: "positive", primary: /\b(messy|edge case|ambiguous|partial input|real-world|caso extremo|ambíguo|caso real|mundo real|caso límite|ambiguo|entrada parcial|caso real|cas limite|ambigu|entrée partielle|monde réel|grenzfall|mehrdeutig|teileingabe|reale welt|caso limite|ambiguo|input parziale|mondo reale)/i, secondary: /\b(unhappy path|corner case|caminho infeliz|caso de canto|caso de esquina|cas extrême|sonderfall|caso d'angolo)/i },
  ],
  guardrails: [
    { w: 1.2, kind: "positive", primary: /\b(failure mode|known issue|risk:|pitfall|threat model|modo de falha|problema conhecido|risco:|armadilha|modelo de ameaça|modo de fallo|problema conocido|riesgo:|modelo de amenaza|mode d'échec|problème connu|risque:|modèle de menace|fehlermodus|bekanntes problem|risiko:|bedrohungsmodell|modalità di guasto|problema noto|rischio:|modello di minaccia)/i, secondary: /\b(can go wrong|caveat|pode dar errado|ressalva|puede fallar|salvedad|peut échouer|mise en garde|kann schiefgehen|vorbehalt|può andare male|avvertenza)/i },
    { w: 1.2, kind: "positive", primary: /\b(mitigat|prevent|guard against|defen[sc]e|countermeasure|mitiga|preven[ir]|proteger contra|defesa|contramedida|mitigar|prevenir|proteger contra|defensa|contramedida|atténu|prévenir|défense|contre[- ]mesure|abmilder|verhindern|verteidigung|gegenmaßnahme|mitigare|prevenire|difesa|contromisura)/i, secondary: /\b(to avoid|para evitar|para evitar|pour éviter|um zu vermeiden|per evitare)/i },
    { w: 1.3, kind: "positive", primary: /\b(prompt injection|untrusted|treat .* as data|ignore instructions|injeção de prompt|não-confiável|tratar .* como dados|ignorar instruções|inyección de prompt|no confiable|tratar .* como datos|ignorar instrucciones|injection de prompt|non fiable|traiter .* comme des données|ignorer les instructions|prompt[- ]injektion|nicht vertrauenswürdig|als daten behandeln|anweisungen ignorieren|iniezione di prompt|non affidabile|trattare .* come dati|ignorare istruzioni)/i, secondary: /\b(sanitiz|do not follow instructions|sanitiza|não seguir instruções|saniti[zs]ar|no seguir instrucciones|assainir|ne pas suivre les instructions|bereinigen|anweisungen nicht befolgen|sanific|non seguire istruzioni)/i },
    { w: 1, kind: "positive", primary: /\b(pii|secret|redact|do not log|citation|cite sources|lgpd|gdpr|dados pessoais|segredo|redigir|não registrar|citação|citar fontes|datos personales|secreto|redactar|no registrar|cita|citar fuentes|données personnelles|secret|caviarder|ne pas journaliser|citation|citer les sources|personenbezogene daten|geheim|schwärzen|nicht protokollieren|zitat|quellen zitieren|dati personali|segreto|oscurare|non registrare|citazione|citare fonti)\b/i, secondary: /\b(confidential|sensitive data|confidencial|dados sensíveis|confidencial|datos sensibles|confidentiel|données sensibles|vertraulich|sensible daten|confidenziale|dati sensibili)/i },
    // Enforcement strength: deterministic gates / regression suites / fail-closed
    { w: 1.4, kind: "positive", primary: /\b(deterministic gate|exit code|regression suite|policy engine|opa\b|cedar\b|fail[- ]closed|automated test|external enforcement|gate determinístico|código de saída|suíte de regressão|motor de política|falha[- ]segura|teste automatizado|aplicación externa|puerta determinista|código de salida|suite de regresión|motor de políticas|fallo[- ]seguro|prueba automatizada|porte déterministe|code de sortie|suite de régression|moteur de politique|test automatisé|deterministisches gate|exit-code|regressionssuite|richtlinien-engine|fehlersicher|automatisierter test|gate deterministico|codice di uscita|suite di regressione|motore di policy|fail-safe|test automatizzato)/i, secondary: /\b(regex check|ast check|signed (release|bundle)|verificação por regex|verificação de ast|release assinado|verificación regex|verificación ast|release firmado|vérification regex|version signée|signierter release|controllo regex|release firmato)/i },
  ],
  trust: [
    { w: 1, kind: "positive", primary: /\b(validated on|tested on|claude|gpt-|gemini|llama|validado em|testado em|validado en|probado en|validé sur|testé sur|validiert auf|getestet auf|validato su|testato su)/i, secondary: /\b(model:|benchmarked|modelo:|avaliado em|modelo:|evaluado|modèle:|évalué|modell:|bewertet|modello:|valutato)/i },
    { w: 1.1, kind: "positive", primary: /\b(acceptance criteri|success criter|self-eval|self check|critério de aceitação|critério de sucesso|auto-avaliação|criterio de aceptación|criterio de éxito|autoevaluación|critère d'acceptation|critère de succès|auto-évaluation|akzeptanzkriteri|erfolgskriteri|selbstbewertung|criterio di accettazione|criterio di successo|auto-valutazione)/i, secondary: /\b(pass if|must satisfy|aprova se|deve satisfazer|aprueba si|debe satisfacer|réussit si|doit satisfaire|besteht wenn|muss erfüllen|passa se|deve soddisfare)/i },
    { w: 1.1, kind: "positive", primary: /\b(output schema|return json|structured (output|result)|esquema de saída|retornar json|saída estruturada|esquema de salida|devolver json|salida estructurada|schéma de sortie|retourner json|sortie structurée|ausgabeschema|json zurückgeben|strukturierte ausgabe|schema di output|restituire json|output strutturato)/i, secondary: /\b(named sections|format:|seções nomeadas|formato:|secciones nombradas|formato:|sections nommées|format:|benannte abschnitte|format:|sezioni nominate|formato:)/i },
    { w: 0.9, kind: "positive", primary: /\b(report_execution|telemetry|emit metrics|telemetria|emitir métricas|telemetría|emitir métricas|télémétrie|émettre des métriques|telemetrie|metriken senden|telemetria|emettere metriche)/i, secondary: /\b(track success|rastrear sucesso|rastrear éxito|suivre le succès|erfolg verfolgen|tracciare successo)/i },
  ],
  portability: [
    // Vendor lock-in (negative)
    { w: 1, kind: "negative", primary: /\b(only works on|requires claude|requires gpt|requires gemini|claude-only|funciona apenas em|requer claude|requer gpt|requer gemini|funciona solo en|requiere claude|requiere gpt|fonctionne uniquement sur|nécessite claude|nécessite gpt|funktioniert nur auf|benötigt claude|benötigt gpt|funziona solo su|richiede claude|richiede gpt)/i, secondary: /\bvendor-specific\b|específico de fornecedor|específico del proveedor|spécifique au fournisseur|anbieterspezifisch|specifico del fornitore/i },
    { w: 1, kind: "negative", primary: /\b(anthropic sdk|openai sdk|google ai sdk|tool_use block)\b/i },
    { w: 0.6, kind: "negative", primary: /.{32001,}/s },
    { w: 0.6, kind: "negative", primary: /^---[\s\S]*?(lovable:|proprietary:|internal:)/m },
    // Cross-runtime evidence (positive)
    { w: 1.1, kind: "positive", primary: /\b(model[- ]agnostic|runtime[- ]independent|works on (claude|gpt|gemini).*and.*(claude|gpt|gemini)|cross[- ]runtime|agnóstico (de|a) modelo|independente de runtime|agnóstico de modelo|independiente de runtime|agnostique au modèle|indépendant du runtime|modellunabhängig|laufzeitunabhängig|agnostico al modello|indipendente dal runtime)/i, secondary: /\b(portable across|portátil entre|portable entre|portable entre|portabel zwischen|portabile tra)/i },
    { w: 0.9, kind: "positive", primary: /\b(plain markdown|standard skill\.md|skill\.md format|markdown puro|formato skill\.md padrão|markdown plano|formato skill\.md estándar|markdown simple|format skill\.md standard|einfaches markdown|standard skill\.md format|markdown semplice|formato skill\.md standard)/i },
  ],
};

const DIRECTIVES: Record<PillarId, string[]> = {
  identity: [
    "Give it a sharper sense of self: who it is, what it refuses, and what it explicitly is NOT for.",
    "The persona reads generic — make its values and voice specific enough that a stranger could imitate it.",
    "Add an explicit refusal posture so unsafe or out-of-scope asks are handled deliberately, not improvised.",
  ],
  scope: [
    "Make activation unambiguous: when this should fire and the look-alike cases where it must NOT.",
    "Tighten the trigger boundary — right now it would over- or under-fire on adjacent requests.",
    "Name the intended user and the one-line job so the agent self-selects correctly.",
  ],
  procedure: [
    "Turn the prose into a deterministic, step-wise procedure with explicit inputs, outputs and a stop condition.",
    "The happy path is clear but the forks are not — make the 2-3 main decision branches explicit.",
    "Add a concrete definition of done so the agent knows when to stop instead of looping or trailing off.",
  ],
  examples: [
    "Add worked examples (input → reasoning → output); models generalise from these far better than from rules.",
    "Include at least one failure example with the correction — negative examples prevent the common mistake.",
    "Replace a happy-path example with a messy, real-world one; that is where this currently breaks.",
  ],
  guardrails: [
    "Pre-empt the failure modes you have already seen: name them and attach a concrete mitigation to each.",
    "Harden against prompt injection — make explicit that tool output and user docs are data, not instructions.",
    "Add data-handling rules (PII, secrets, citations) so it fails safe under pressure.",
    "Move enforcement out of the prompt: a deterministic gate (regex/AST/policy engine) with an exit code and a regression suite is far stronger evidence than prose rules.",
  ],
  trust: [
    "Make it measurable: declare validated models and an acceptance criterion the host can verify.",
    "Emit a structured result instead of free prose so success can be checked and scored automatically.",
    "Close the loop — instruct the host to report execution outcomes so this can earn a trust score.",
  ],
  portability: [
    "Remove single-vendor assumptions so the same primitive runs on Claude, GPT and Gemini without surgery.",
    "Describe tools by contract, not by a specific SDK, and keep it within a typical context budget.",
    "Strip proprietary frontmatter the host can't parse; keep it plain, portable Markdown.",
    "State cross-runtime support explicitly (e.g. 'validated on Claude, GPT and Gemini') — the engine cannot infer portability from absence alone.",
  ],
};

interface PillarScore {
  pillar: PillarId;
  title: string;
  score: number;
}

interface PillarDetail {
  id: PillarId;
  score: number;
  deficit: number;
  signals_total: number;
  signals_hit: number;
  evidence: Array<{ line: number; excerpt: string }>;
}

// Find the line number + a short excerpt for the first regex hit. Used to
// anchor top_actions to a concrete location instead of being generic.
function findEvidence(text: string, re: RegExp): { line: number; excerpt: string } | null {
  const m = re.exec(text);
  if (!m) return null;
  const idx = m.index;
  const before = text.slice(0, idx);
  const line = before.split("\n").length;
  const lineStart = before.lastIndexOf("\n") + 1;
  const lineEnd = text.indexOf("\n", idx);
  const raw = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim();
  const excerpt = raw.length > 140 ? raw.slice(0, 137) + "…" : raw;
  return { line, excerpt };
}

function scorePillar(id: PillarId, text: string): PillarDetail {
  const signals = SIGNALS[id];
  let earned = 0;
  let total = 0;
  let hit = 0;
  const evidence: PillarDetail["evidence"] = [];

  signals.forEach((s) => {
    total += s.w;
    const primaryHit = s.primary.test(text);
    const secondaryHit = s.secondary ? s.secondary.test(text) : false;
    let frac = primaryHit ? 1 : secondaryHit ? 0.5 : 0;
    // Negative signals: presence is bad. Absence (frac=0) becomes good (1).
    // Crucially, a negative signal contributes to "hit" only when it ACTUALLY
    // matched — so portability no longer hits 100 just from absence.
    if (s.kind === "negative") {
      frac = 1 - frac;
    }
    earned += frac * s.w;
    if (primaryHit || secondaryHit) {
      hit += 1;
      const ev = findEvidence(text, primaryHit ? s.primary : (s.secondary as RegExp));
      if (ev) evidence.push(ev);
    }
  });

  let score = total > 0 ? Math.round((earned / total) * 100) : 0;
  // Cap any pillar that scored on zero positive evidence — prevents the
  // "all-negative-signals → 100 by default" smell. Affects portability most.
  const positiveSignals = signals.filter((s) => s.kind === "positive").length;
  const positiveHits = signals.filter(
    (s) => s.kind === "positive" && (s.primary.test(text) || (s.secondary && s.secondary.test(text)))
  ).length;
  if (positiveSignals > 0 && positiveHits === 0) {
    score = Math.min(score, 60); // graceful cap, not zero
  }
  score = Math.max(0, Math.min(100, score));
  return { id, score, deficit: 100 - score, signals_total: signals.length, signals_hit: hit, evidence };
}

function gradeBand(n: number): string {
  if (n >= 90) return "A — battle-ready";
  if (n >= 78) return "B — solid, minor gaps";
  if (n >= 62) return "C — usable, real gaps";
  if (n >= 45) return "D — needs work";
  return "F — rewrite recommended";
}

function statusBand(n: number): "strong" | "adequate" | "weak" {
  return n >= 78 ? "strong" : n >= 55 ? "adequate" : "weak";
}

// Cheap heuristic — counts diacritics + PT-BR function words. Used only to
// emit a `language` hint and a low-confidence caveat; does NOT alter scoring.
function detectLanguage(text: string): { lang: "en" | "pt" | "other"; confidence: number } {
  const sample = text.slice(0, 8000).toLowerCase();
  const ptHits = (sample.match(/\b(não|você|são|também|então|porém|porque|usuário|exemplo|gatilho|fora de escopo|valores|critério|saída|entrada)\b|[ãõçáéíóúâêô]/g) ?? []).length;
  const enHits = (sample.match(/\b(the|and|when|use|trigger|example|input|output|scope|values|user|must|should|never)\b/g) ?? []).length;
  if (ptHits > enHits * 1.2 && ptHits > 10) return { lang: "pt", confidence: Math.min(1, ptHits / 60) };
  if (enHits > ptHits * 1.2 && enHits > 10) return { lang: "en", confidence: Math.min(1, enHits / 60) };
  return { lang: "other", confidence: 0.3 };
}

function pickDirective(id: PillarId, content: string, salt: number): string {
  const pool = DIRECTIVES[id];
  let h = salt;
  for (let i = 0; i < content.length; i += 97) h = (h * 31 + content.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

// Anchor a directive to concrete file evidence when we have it. When a pillar
// scored 0 with no hits, surface that explicitly so the host knows the engine
// found nothing matching — not that the file is silently bad.
function buildAction(detail: PillarDetail, content: string, priority: number): {
  area: string;
  priority: number;
  action: string;
  evidence: { line: number; excerpt: string } | null;
  signal_summary: string;
} {
  const directive = pickDirective(detail.id, content, priority);
  const ev = detail.evidence[0] ?? null;
  let action: string;
  if (ev) {
    action = `Near line ${ev.line} ("${ev.excerpt}"): ${directive}`;
  } else if (detail.signals_hit === 0) {
    action = `No content recognised for "${PILLAR_TITLE[detail.id]}" — ${directive}`;
  } else {
    action = directive;
  }
  return {
    area: PILLAR_TITLE[detail.id],
    priority,
    action,
    evidence: ev,
    signal_summary: `${detail.signals_hit}/${detail.signals_total} signals matched`,
  };
}

export const getMethodologyTool = defineTool({
  name: "get_methodology",
  description:
    "[UPGRADE] Orientation for the local-file upgrade flow. Returns the dimensions the proprietary SuperAgentSkill engine evaluates and how to drive the loop — NOT the rubric, signals or thresholds. Read-only, no auth.",
  parameters: z.object({}),
  execute: async () =>
    json({
      engine: ENGINE,
      name: "Super Agent Skill evaluation",
      proprietary: true,
      note:
        "Scoring is performed server-side. Signal detection is bilingual (EN + PT-BR); other languages may underscore — write in EN or PT-BR for best signal. The engine is calibrated for kebab-case Markdown skill files following the Anthropic SKILL.md conventions; long-form governance prose may underscore even when the underlying content is strong, because some signals look for structured cues (worked input/output blocks, named sections, acceptance criteria).",
      dimensions: (Object.keys(PILLAR_TITLE) as PillarId[]).map((id) => ({
        id,
        title: PILLAR_TITLE[id],
      })),
      how_to_use: [
        "1. review_skill — submit the file; get overall_score, per-dimension scores, signal-hit counts and file-anchored top_actions (with line numbers and excerpts when evidence exists).",
        "2. You (the host agent) apply the actions in the user's repo.",
        "3. review_skill again — confirm the score rose. Iterate until grade A.",
      ],
    }),
});

export const reviewSkillTool = defineTool({
  name: "review_skill",
  description:
    "[UPGRADE] Score a local skill / playbook / soul / guardrail with the proprietary SuperAgentSkill engine. Returns overall_score (0-100), grade, per-dimension scores (with `signals_hit`/`signals_total` so you can see why a pillar landed low) and `top_actions` anchored to concrete file evidence (line number + excerpt) when available. The detection signals, weights and thresholds remain server-side. NOTE: signal detection is bilingual (EN + PT-BR) and calibrated for Markdown skill files; long-form governance prose in other languages may underscore — see `language` and `format_caveat` in the response. Read-only, no auth.",
  parameters: z.object({
    name: z.string().min(1).max(200).describe("File or skill name (for the report header only)"),
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).default("skill"),
    content: z.string().min(20).max(120_000).describe("Raw markdown / prompt text of the local file"),
  }),
  execute: async ({ name, type, content }) => {
    const ids = Object.keys(PILLAR_TITLE) as PillarId[];
    const weights = TYPE_WEIGHTS[type] ?? TYPE_WEIGHTS.skill;
    const details = ids.map((id) => scorePillar(id, content));
    const language = detectLanguage(content);

    let wSum = 0;
    let wTotal = 0;
    for (const r of details) {
      const w = weights[r.id] ?? 1;
      wSum += r.score * w;
      wTotal += w;
    }
    const overall = Math.round(wSum / wTotal);

    const pillars = details.map((r) => ({
      pillar: r.id,
      title: PILLAR_TITLE[r.id],
      score: r.score,
      status: statusBand(r.score),
      signals_hit: r.signals_hit,
      signals_total: r.signals_total,
      diagnostic:
        r.score === 0
          ? "Pillar scored 0 — the engine found no recognised pattern for this dimension in the submitted text. If your file does cover this in another idiom, rephrase with the conventional vocabulary (EN or PT-BR) so detectors catch it."
          : r.signals_hit === 0
            ? "No positive signals matched, but the pillar avoided 0 via penalty-absence. Add explicit content for this dimension."
            : null,
    }));

    const ranked = [...details]
      .map((r) => ({ ...r, impact: r.deficit * (weights[r.id] ?? 1) }))
      .sort((a, b) => b.impact - a.impact)
      .filter((r) => r.impact > 0)
      .slice(0, 4);

    const topActions = ranked.map((r, i) => buildAction(r, content, i + 1));

    const formatCaveat =
      language.lang === "other"
        ? "The engine could not confidently detect EN or PT-BR. Signal detection is bilingual; other languages will underscore by mismatch, not by quality. Translate or duplicate key cues into EN or PT-BR for a fair score."
        : language.lang === "pt" && language.confidence < 0.5
          ? "Low-confidence Portuguese detection. Ensure conventional terms (gatilho, exemplo, modo de falha, mitigação, critério de aceitação, esquema de saída) appear verbatim so detectors catch them."
          : null;

    return json({
      file: name,
      type,
      engine: ENGINE,
      overall_score: overall,
      grade: gradeBand(overall),
      language: { detected: language.lang, confidence: Math.round(language.confidence * 100) / 100 },
      format_caveat:
        formatCaveat ??
        "The engine is calibrated for Markdown skill files with named sections + worked input/output examples. Pure governance prose may underscore even when content is strong — that's a format mismatch, not a quality verdict.",
      pillars,
      top_actions: topActions,
      next_steps:
        topActions.length === 0
          ? ["Grade A — no high-impact gaps detected. Re-run after any substantive edit."]
          : [
              "Apply the top_actions in the user's local file — each action carries a line number and an excerpt when the engine could anchor evidence.",
              "Re-run review_skill with the updated content to confirm the score rose.",
              "If a pillar shows `diagnostic`, address that first — those are blind spots, not quality misses.",
            ],
    });
  },
});
