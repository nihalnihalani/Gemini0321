import { z } from "zod";

export const ExplainerSchema = z.object({
  title: z.string(),
  steps: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      iconUrl: z.string().optional(),
    })
  ),
  conclusion: z.string(),
  introNarration: z.string().optional(),
  summaryNarration: z.string().optional(),
  narrationUrls: z.record(z.string(), z.string()).optional(),
  sfxUrls: z.record(z.string(), z.string()).optional(),
  musicUrl: z.string().optional(),
});

export type ExplainerProps = z.infer<typeof ExplainerSchema>;
