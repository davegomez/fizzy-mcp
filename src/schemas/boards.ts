import { z } from "zod";

// Embedded in BoardSchema - lighter than full ColumnSchema (omits timestamps, url)
export const ColumnSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	color: z.string(),
	cards_count: z.number(),
	position: z.number(),
});

export const BoardSchema = z.object({
	id: z.string(),
	name: z.string(),
	slug: z.string(),
	description: z.string().nullable(),
	columns: z.array(ColumnSummarySchema),
	created_at: z.string(),
	updated_at: z.string(),
	url: z.string().url(),
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
export type CreateBoardInput = z.infer<typeof CreateBoardInputSchema>;
export type UpdateBoardInput = z.infer<typeof UpdateBoardInputSchema>;
