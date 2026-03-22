import { z } from "zod";

export const SocialPromoSchema = z.object({
  hook: z.string(),
  productImage: z.string(),
  features: z.array(z.string()),
  cta: z.string(),
  aspectRatio: z.enum(["16:9", "9:16"]).default("16:9"),
  musicUrl: z.string().optional(),
});

export type SocialPromoProps = z.infer<typeof SocialPromoSchema>;
