import { z } from "zod";

export const TagSchema = z.object({
	id: z.string(),
	title: z.string(),
	color: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
});

export type Tag = z.infer<typeof TagSchema>;
