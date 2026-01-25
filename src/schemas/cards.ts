import { z } from "zod";

export const CardAssigneeSchema = z.object({
	id: z.string(),
	name: z.string(),
	email_address: z.string(),
});

export const CardTagSchema = z.object({
	id: z.string(),
	title: z.string(),
	color: z.string(),
});

export const CardStatusSchema = z.enum(["open", "closed", "deferred"]);

export const CardSchema = z.object({
	id: z.string(),
	number: z.number(),
	title: z.string(),
	description_html: z.string().nullable(),
	status: CardStatusSchema,
	board_id: z.string(),
	// Null when card is closed or not yet placed in a column
	column_id: z.string().nullable(),
	tags: z.array(CardTagSchema),
	assignees: z.array(CardAssigneeSchema),
	steps_count: z.number(),
	completed_steps_count: z.number(),
	comments_count: z.number(),
	created_at: z.string(),
	updated_at: z.string(),
	closed_at: z.string().nullable(),
	url: z.string(),
});

export const CardFiltersSchema = z.object({
	board_id: z.string().optional(),
	column_id: z.string().optional(),
	tag_ids: z.array(z.string()).optional(),
	assignee_ids: z.array(z.string()).optional(),
	status: CardStatusSchema.optional(),
});

export const CreateCardInputSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
});

export const UpdateCardInputSchema = z.object({
	title: z.string().min(1).optional(),
	description: z.string().optional(),
});

export type CardAssignee = z.infer<typeof CardAssigneeSchema>;
export type CardTag = z.infer<typeof CardTagSchema>;
export type CardStatus = z.infer<typeof CardStatusSchema>;
export type Card = z.infer<typeof CardSchema>;
export type CardFilters = z.infer<typeof CardFiltersSchema>;
export type CreateCardInput = z.infer<typeof CreateCardInputSchema>;
export type UpdateCardInput = z.infer<typeof UpdateCardInputSchema>;
