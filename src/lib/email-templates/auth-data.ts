import { z } from "zod";
export const AuthEmailDataSchema = z
  .object({
    action_type: z.enum([
      "signup",
      "invite",
      "magiclink",
      "recovery",
      "email_change",
      "reauthentication",
    ]),
    email: z.string().min(1),
    url: z.string().nullish(),
    token: z.string().nullish(),
    old_email: z.string().nullish(),
    new_email: z.string().nullish(),
  })
  .superRefine((data, ctx) => {
    const field = data.action_type === "reauthentication" ? "token" : "url";
    if (!data[field])
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: `${field} is required for ${data.action_type}`,
      });
  });
