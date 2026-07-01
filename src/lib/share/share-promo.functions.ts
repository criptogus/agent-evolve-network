import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { getGatewayModel } from "@/lib/ai-gateway";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

const InputSchema = z.object({
  slug: z.string().min(1).max(120),
  type: z.enum(["skill", "playbook", "soul", "guardrail", "pack"]),
  url: z.string().url(),
});

type Input = z.infer<typeof InputSchema> & { name: string; description: string };

const TYPE_LABEL: Record<Input["type"], string> = {
  skill: "AI skill",
  playbook: "AI playbook",
  soul: "AI agent persona",
  guardrail: "AI guardrail",
  pack: "AI agent pack",
};

const HASHTAGS = "#AI #Agents #SuperAgentSkill";

// Tiny in-memory layer in front of the DB cache (per-Worker isolate).
type MemEntry = { at: number; body: string };
const MEM_TTL_MS = 10 * 60 * 1000;
const mem = new Map<string, MemEntry>();

function fallbackBody({ name, description, type }: Omit<Input, "url">): string {
  const label = TYPE_LABEL[type];
  const desc = description.replace(/\s+/g, " ").trim();
  const head = `🚀 New ${label}: ${name}`;
  // Reserve room for URL (~24) + hashtags + newlines.
  const room = 280 - 24 - HASHTAGS.length - head.length - 6;
  const body = desc.length > room ? desc.slice(0, Math.max(0, room - 1)).trimEnd() + "…" : desc;
  return `${head}\n\n${body}`;
}

async function generateBody(input: Omit<Input, "url">): Promise<{ body: string; source: "ai" | "fallback" }> {
  try {
    const model = getGatewayModel("google/gemini-2.5-flash-lite");
    const { text } = await generateText({
      model,
      system:
        "You write short, punchy promotional tweets in English (max 240 characters, no hashtags, no emojis at the end, exactly one emoji at the start, no quotes, no URL — the URL will be appended separately). Tone: enthusiastic, concrete, builder-focused. Mention what the package does and who it's for.",
      prompt: `Write a tweet promoting this ${TYPE_LABEL[input.type]}.\n\nName: ${input.name}\nDescription: ${input.description}\n\nReturn ONLY the tweet text.`,
    });
    const cleaned = (text || "").replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!cleaned) throw new Error("empty");
    const trimmed = cleaned.length > 240 ? cleaned.slice(0, 239).trimEnd() + "…" : cleaned;
    return { body: trimmed, source: "ai" };
  } catch {
    return { body: fallbackBody(input), source: "fallback" };
  }
}

function assemble(body: string, url: string): string {
  return `${body}\n\n${HASHTAGS}\n${url}`;
}

/**
 * Read cached body from DB, generate + persist if missing.
 * Used by both the public server fn and the prewarm cron.
 */
export async function getOrGenerateBody(input: Omit<Input, "url">): Promise<string> {
  const key = `${input.type}:${input.slug}`;
  const now = Date.now();
  const memHit = mem.get(key);
  if (memHit && now - memHit.at < MEM_TTL_MS) return memHit.body;

  // DB cache
  const { data: row } = await supabaseAdmin
    .from("share_promos")
    .select("body")
    .eq("type", input.type)
    .eq("slug", input.slug)
    .maybeSingle();
  if (row?.body) {
    mem.set(key, { at: now, body: row.body });
    return row.body;
  }

  // Generate + persist
  const { body, source } = await generateBody(input);
  await supabaseAdmin.from("share_promos").upsert(
    {
      type: input.type,
      slug: input.slug,
      body,
      source,
      name: input.name,
      description: input.description,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "type,slug" }
  );
  mem.set(key, { at: now, body });
  return body;
}

async function resolveAuthoritative(
  type: Input["type"],
  slug: string,
): Promise<{ name: string; description: string } | null> {
  if (type === "pack") {
    const { data } = await supabaseAdmin
      .from("packs")
      .select("name,description,is_published,review_status")
      .eq("slug", slug)
      .maybeSingle();
    if (!data || !data.is_published || data.review_status !== "approved") return null;
    return { name: data.name, description: data.description ?? data.name };
  }
  const { data } = await supabaseAdmin
    .from("packages")
    .select("name,description,type,is_published,review_status")
    .eq("slug", slug)
    .eq("type", type)
    .maybeSingle();
  if (!data || !data.is_published || data.review_status !== "approved") return null;
  return { name: data.name, description: data.description ?? data.name };
}

export const getSharePromo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    // Ignore client-supplied name/description — always look them up from the
    // authoritative packages/packs row to prevent cache poisoning of the
    // shared (type,slug)-keyed promo body.
    const authoritative = await resolveAuthoritative(data.type, data.slug);
    if (!authoritative) {
      throw new Error("Package not found or not published");
    }
    const body = await getOrGenerateBody({
      slug: data.slug,
      type: data.type,
      name: authoritative.name,
      description: authoritative.description,
    });
    return { text: assemble(body, data.url) };
  });
