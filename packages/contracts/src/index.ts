import { z } from "zod";

export const RenderRequestSchema = z.object({
  templateKey: z.string().min(1),
  inputs: z.record(z.string(), z.unknown()),
});

export type RenderRequest = z.infer<typeof RenderRequestSchema>;
