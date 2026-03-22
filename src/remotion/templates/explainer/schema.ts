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
  musicUrl: z.string().optional(),
});

export type ExplainerProps = z.infer<typeof ExplainerSchema>;
