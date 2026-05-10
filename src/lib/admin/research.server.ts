import { generateText, Output } from "ai";
import { z } from "zod";
import { getGatewayModel } from "@/lib/ai-gateway";

const ResearchSchema = z.object({
  summary: z.string().min(40),
  key_concepts: z.array(z.string()).max(20),
  best_practices: z.array(z.string()).max(20),
  sources: z
    .array(z.object({ title: z.string(), url: z.string().optional(), note: z.string().optional() }))
    .max(20),
});

export type ResearchResult = z.infer<typeof ResearchSchema>;

/**
 * Web research helper. Uses Perplexity if PERPLEXITY_API_KEY is set,
 * otherwise falls back to Lovable AI Gateway with a strict citation prompt.
 * Returns a state-of-the-art synthesis the authoring pipeline can ground on.
 */
export async function webResearch(topic: string, kind: string): Promise<ResearchResult> {
  const ppx = process.env.PERPLEXITY_API_KEY;
  if (ppx) {
    try {
      const r = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${ppx}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content:
                "You are a research analyst. Identify the state of the art for the topic, list reputable sources with URLs, and extract concrete best practices an LLM agent should follow.",
            },
            {
              role: "user",
              content: `Topic: ${topic}\nPrimitive kind: ${kind}\nReturn a tight synthesis covering: definition, current state of the art, top 5 reputable sources with URLs, and 6-10 best practices an autonomous agent should encode.`,
            },
          ],
          temperature: 0.2,
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const content: string = j?.choices?.[0]?.message?.content ?? "";
        const citations: string[] = j?.citations ?? [];
        return {
          summary: content.slice(0, 4000),
          key_concepts: [],
          best_practices: [],
          sources: citations.map((u) => ({ title: u, url: u })),
        };
      }
    } catch (e) {
      console.error("[research] perplexity failed, falling back:", e);
    }
  }

  // Fallback: Lovable AI grounded synthesis.
  const model = getGatewayModel("openai/gpt-5.2");
  const { experimental_output } = await generateText({
    model,
    system:
      "You are a senior research analyst. Produce a grounded synthesis of the state of the art for the user's topic. Only cite sources you are reasonably confident exist; if unsure, omit the URL and add a note. Output strict JSON.",
    prompt: `Topic: ${topic}\nPrimitive kind: ${kind}\nReturn a tight synthesis with the top concepts, best practices, and reputable sources.`,
    experimental_output: Output.object({ schema: ResearchSchema }),
  });
  return experimental_output;
}
