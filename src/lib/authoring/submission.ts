import type { AppDatabaseClient } from "../../integrations/supabase/database.ts";
import { z } from "zod";
import { parseAuthoredDocument } from "./document.ts";
import { toJson } from "../json.ts";

export async function submitAuthoredDocument(
  client: AppDatabaseClient,
  author: string,
  source: string,
) {
  const document = parseAuthoredDocument(source);
  const { data, error } = await client.rpc("submit_authored_package", {
    _author: z.string().uuid().parse(author),
    _document: toJson(document),
  });
  if (error) throw new Error("Draft submission failed; no public release was created");
  return z
    .object({
      id: z.string().uuid(),
      slug: z.string(),
      version: z.string(),
      visibility: z.literal("private_draft"),
      review_status: z.literal("draft"),
    })
    .parse(data);
}
