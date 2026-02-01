import { z } from "zod";
import { UserSchema } from "./identity.js";

export const ColumnColorSchema = z.object({
	name: z.string(),
	value: z.string(),
});

// Embedded in BoardSchema - lighter than full ColumnSchema
export const ColumnSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	color: ColumnColorSchema,
});

export const BoardSchema = z.object({
	id: z.string(),
	name: z.string(),
	all_access: z.boolean(),
	creator: UserSchema,
	columns: z.array(ColumnSummarySchema).optional(),
	created_at: z.string(),
	url: z.string().url(),
});

export const BoardWithColumnsSchema = BoardSchema.extend({
	columns: z.array(ColumnSummarySchema),
});

export const CreateBoardInputSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
});

export const UpdateBoardInputSchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
});

export type ColumnSummary = z.infer<typeof ColumnSummarySchema>;
export type Board = z.infer<typeof BoardSchema>;
export type BoardWithColumns = z.infer<typeof BoardWithColumnsSchema>;
export type CreateBoardInput = z.infer<typeof CreateBoardInputSchema>;
export type UpdateBoardInput = z.infer<typeof UpdateBoardInputSchema>;
