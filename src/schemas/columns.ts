import { z } from "zod";

export const ColumnSchema = z.object({
	id: z.string(),
	name: z.string(),
	color: z.string(),
	position: z.number(),
	cards_count: z.number(),
	created_at: z.string(),
	updated_at: z.string(),
	url: z.string().url(),
});

export const CreateColumnInputSchema = z.object({
	name: z.string().min(1),
	color: z.string().optional(),
});

export const UpdateColumnInputSchema = z.object({
	name: z.string().min(1).optional(),
	color: z.string().optional(),
});

export type Column = z.infer<typeof ColumnSchema>;
export type CreateColumnInput = z.infer<typeof CreateColumnInputSchema>;
export type UpdateColumnInput = z.infer<typeof UpdateColumnInputSchema>;
