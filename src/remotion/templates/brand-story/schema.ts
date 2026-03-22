import { z } from "zod";

export const BrandStorySchema = z.object({
  companyName: z.string(),
  mission: z.string(),
  teamPhotos: z.array(z.string()),
  milestones: z.array(
    z.object({
      year: z.string(),
      event: z.string(),
    })
  ),
  vision: z.string(),
  logoUrl: z.string().optional(),
  musicUrl: z.string().optional(),
});

export type BrandStoryProps = z.infer<typeof BrandStorySchema>;
