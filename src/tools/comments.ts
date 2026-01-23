import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { htmlToMarkdown } from "../client/markdown.js";
import type { Comment } from "../schemas/comments.js";
import { getDefaultAccount } from "../state/session.js";
import { isErr } from "../types/result.js";

function resolveAccount(accountSlug?: string): string {
	const slug = (accountSlug || getDefaultAccount())?.replace(/^\//, "");
	if (!slug) {
		throw new UserError(
			"No account specified and no default set. Use fizzy_set_default_account first.",
		);
	}
	return slug;
}

function truncateBody(html: string, maxLen = 150): string {
	const md = htmlToMarkdown(html);
	return md.length > maxLen ? `${md.slice(0, maxLen)}...` : md;
}

function formatCommentList(comments: Comment[]): string {
	if (comments.length === 0) {
		return "No comments found.";
	}
	return comments
		.map((c) => {
			const timestamp = new Date(c.created_at).toLocaleString();
			const body = truncateBody(c.body.html);
			return `[${c.id}] ${c.creator.name} (${timestamp}):\n  ${body}`;
		})
		.join("\n\n");
}

function formatComment(comment: Comment): string {
	return JSON.stringify(
		{
			id: comment.id,
			body: htmlToMarkdown(comment.body.html),
			creator: {
				id: comment.creator.id,
				name: comment.creator.name,
			},
			created_at: comment.created_at,
			updated_at: comment.updated_at,
			url: comment.url,
		},
		null,
		2,
	);
}

export const listCommentsTool = {
	name: "fizzy_list_comments",
	description:
		"List comments on a card. Returns newest-first. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to list comments for."),
	}),
	execute: async (args: { account_slug?: string; card_number: number }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listComments(slug, args.card_number);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return formatCommentList(result.value);
	},
};

export const createCommentTool = {
	name: "fizzy_create_comment",
	description:
		"Create a comment on a card. Body accepts markdown (auto-converted to HTML). Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to comment on."),
		body: z.string().describe("Comment body (markdown supported)."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		body: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.createComment(
			slug,
			args.card_number,
			args.body,
		);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return formatComment(result.value);
	},
};

export const updateCommentTool = {
	name: "fizzy_update_comment",
	description:
		"Update a comment on a card. Only the comment author can edit. Body accepts markdown (auto-converted to HTML). Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number the comment is on."),
		comment_id: z.string().describe("Comment ID to update."),
		body: z.string().describe("New comment body (markdown supported)."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		comment_id: string;
		body: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.updateComment(
			slug,
			args.card_number,
			args.comment_id,
			args.body,
		);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return formatComment(result.value);
	},
};

export const deleteCommentTool = {
	name: "fizzy_delete_comment",
	description:
		"Delete a comment from a card. Requires force=true to confirm. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number the comment is on."),
		comment_id: z.string().describe("Comment ID to delete."),
		force: z
			.boolean()
			.describe(
				"Must be true to confirm deletion. Prevents accidental deletes.",
			),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		comment_id: string;
		force: boolean;
	}) => {
		if (!args.force) {
			throw new UserError(
				"Deletion requires force=true to confirm. This prevents accidental deletes.",
			);
		}
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.deleteComment(
			slug,
			args.card_number,
			args.comment_id,
		);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return `Comment ${args.comment_id} deleted from card #${args.card_number}.`;
	},
};
