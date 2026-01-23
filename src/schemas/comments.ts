import { z } from "zod";

export const CommentCreatorSchema = z.object({
	id: z.string(),
	name: z.string(),
	email_address: z.string(),
	role: z.string(),
	active: z.boolean(),
});

export const CommentBodySchema = z.object({
	plain_text: z.string(),
	html: z.string(),
});

export const CommentCardReferenceSchema = z.object({
	id: z.string(),
	url: z.string(),
});

export const CommentSchema = z.object({
	id: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	body: CommentBodySchema,
	creator: CommentCreatorSchema,
	card: CommentCardReferenceSchema,
	reactions_url: z.string(),
	url: z.string(),
});

export type CommentCreator = z.infer<typeof CommentCreatorSchema>;
export type CommentBody = z.infer<typeof CommentBodySchema>;
export type CommentCardReference = z.infer<typeof CommentCardReferenceSchema>;
export type Comment = z.infer<typeof CommentSchema>;
