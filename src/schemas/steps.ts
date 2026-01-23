import { z } from "zod";

export const StepSchema = z.object({
	id: z.string(),
	content: z.string(),
	completed: z.boolean(),
});

export type Step = z.infer<typeof StepSchema>;
