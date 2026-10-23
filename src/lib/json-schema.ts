import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
export const JsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonSchema),
    z.record(z.string(), JsonSchema.optional()),
  ]),
);
