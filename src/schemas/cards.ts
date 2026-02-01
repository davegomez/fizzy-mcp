import { z } from "zod";
import { StepSchema } from "./steps.js";

export const CardAssigneeSchema = z.object({
	id: z.string(),
	name: z.string(),
	email_address: z.string(),
});

// Card responses return tags as plain string titles (e.g., ["bug", "feature"])
export const CardTagSchema = z.string();

// Publication status: published (visible) or drafted (hidden)
export const CardStatusSchema = z.enum(["published", "drafted"]);

// Index/filter categories for card queries
export const IndexedBySchema = z.enum([
	"closed",
	"not_now",
	"all",
	"stalled",
	"postponing_soon",
	"golden",
]);

export const BoardRefSchema = z.object({
	id: z.string(),
	name: z.string(),
	url: z.string(),
});

export const ColumnRefSchema = z.object({
	id: z.string(),
	name: z.string(),
	color: z.string(),
});

export const CreatorRefSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.string(),
});

export const CardSchema = z.object({
	id: z.string(),
	number: z.number(),
	title: z.string(),
	description_html: z.string().nullable(),
	status: CardStatusSchema,
	closed: z.boolean(),
	board_id: z.string(),
	// Null when card is closed or not yet placed in a column
	column_id: z.string().nullable(),
	tags: z.array(CardTagSchema),
	assignees: z.array(CardAssigneeSchema),
	steps_count: z.number(),
	completed_steps_count: z.number(),
	comments_count: z.number(),
	steps: z.array(StepSchema).optional(),
	created_at: z.string(),
	updated_at: z.string(),
	closed_at: z.string().nullable(),
	url: z.string(),
	image_url: z.string().nullable().optional(),
	golden: z.boolean().optional(),
	last_active_at: z.string().optional(),
	board: BoardRefSchema.optional(),
	column: ColumnRefSchema.optional(),
	creator: CreatorRefSchema.optional(),
	comments_url: z.string().optional(),
	reactions_url: z.string().optional(),
});

// Sorted-by options for card search
export const SortedBySchema = z.enum(["newest", "oldest", "recently_active"]);

export const CardFiltersSchema = z
	.object({
		board_ids: z.array(z.string()).optional(),
		indexed_by: IndexedBySchema.optional(),
		tag_ids: z.array(z.string()).optional(),
		assignee_ids: z.array(z.string()).optional(),
		sorted_by: SortedBySchema.optional(),
		terms: z.array(z.string()).optional(),
	})
	.strict();

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
export type IndexedBy = z.infer<typeof IndexedBySchema>;
export type Card = z.infer<typeof CardSchema>;
export type CardFilters = z.infer<typeof CardFiltersSchema>;
export type SortedBy = z.infer<typeof SortedBySchema>;
export type CreateCardInput = z.infer<typeof CreateCardInputSchema>;
export type UpdateCardInput = z.infer<typeof UpdateCardInputSchema>;
