import { z } from "zod";
import { ColumnColorSchema } from "./boards.js";

export const ColumnSchema = z.object({
	id: z.string(),
	name: z.string(),
	color: ColumnColorSchema,
	created_at: z.string(),
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
