import { z } from "zod";
const Id = z.string().uuid();
export const CollectionAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    id: Id.optional(),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
    title: z.string().trim().min(2).max(120),
    description: z.string().max(2000),
    is_public: z.boolean(),
    packages: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/)).max(50),
  }),
  z.object({ action: z.literal("delete"), id: Id }),
  z.object({ action: z.literal("follow"), id: Id, follow: z.boolean() }),
]);
export type CollectionActionInput = z.infer<typeof CollectionAction>;
