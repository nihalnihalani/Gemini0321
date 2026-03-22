import { z } from "zod";

export const ProductLaunchSchema = z.object({
  brandName: z.string(),
  tagline: z.string(),
  productImages: z.array(z.string()),
  features: z.array(z.string()),
  brandColor: z.string().optional().default("#1a1a2e"),
  logoUrl: z.string().optional(),
  musicUrl: z.string().optional(),
});

export type ProductLaunchProps = z.infer<typeof ProductLaunchSchema>;
