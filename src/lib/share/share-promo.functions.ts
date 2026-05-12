import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { getGatewayModel } from "@/lib/ai-gateway";

const InputSchema = z.object({
  slug: z.string().min(1).max(120),
  type: z.enum(["skill", "playbook", "soul", "guardrail", "pack"]),
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(800),
  url: z.string().url(),
});

type Input = z.infer<typeof InputSchema>;
type CacheEntry = { at: number; text: string };
const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const cache = new Map<string, CacheEntry>();

const TYPE_LABEL: Record<Input["type"], string> = {
  skill: "AI skill",
  playbook: "AI playbook",
  soul: "AI agent persona",
  guardrail: "AI guardrail",
  pack: "AI agent pack",
};

function fallbackTweet({ name, description, type, url }: Input): string {
  const label = TYPE_LABEL[type];
  const desc = description.replace(/\s+/g, " ").trim();
  const head = `🚀 New ${label}: ${name}`;
  const tag = "\n\n#AI #Agents #SuperAgentSkill";
  // Twitter ~280 chars; URL counts as 23. Reserve room for url + tags.
  const room = 280 - 24 - tag.length - head.length - 4;
  const body = desc.length > room ? desc.slice(0, Math.max(0, room - 1)).trimEnd() + "…" : desc;
  return `${head}\n\n${body}${tag}\n${url}`;
}

async function generateTweet(input: Input): Promise<string> {
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
    return `${trimmed}\n\n#AI #Agents #SuperAgentSkill\n${input.url}`;
  } catch {
    return fallbackTweet(input);
  }
}

export const getSharePromo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = `${data.type}:${data.slug}`;
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && now - hit.at < TTL_MS) return { text: hit.text };
    const text = await generateTweet(data);
    cache.set(key, { at: now, text });
    return { text };
  });
