import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { htmlToMarkdown } from "../client/markdown.js";
import type { Comment } from "../schemas/comments.js";
import { DEFAULT_LIMIT } from "../schemas/pagination.js";
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
	description: `List comments on a card.

Get discussion history for a card, newest-first on first page.

**When to use:**
1. Review discussion thread on a task
2. Find a comment ID for editing or deleting

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`card_number\` (required): Card number to list comments for
- \`limit\` (optional): Max items to return, 1-100 (default: 25)
- \`cursor\` (optional): Continuation cursor from previous response

**Returns:** JSON with items and pagination metadata.
\`\`\`json
{"items": [{"id": "abc123", "body": "...", "creator": {...}}], "pagination": {"returned": 5, "has_more": true, "next_cursor": "..."}}
\`\`\`
First page is newest-first. Subsequent pages via cursor maintain order.

**Related:** Use comment ID with \`fizzy_update_comment\` or \`fizzy_delete_comment\`.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if omitted."),
		card_number: z.number().describe("Card number to list comments for."),
		limit: z
			.number()
			.int()
			.min(1)
			.max(100)
			.default(DEFAULT_LIMIT)
			.describe("Max items to return (1-100, default: 25)."),
		cursor: z
			.string()
			.optional()
			.describe(
				"Continuation cursor from previous response. Omit to start fresh.",
			),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		limit: number;
		cursor?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listComments(slug, args.card_number, {
			limit: args.limit,
			cursor: args.cursor,
		});
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Comment",
				container: `card #${args.card_number}`,
			});
		}
		return JSON.stringify(result.value, null, 2);
	},
};

export const createCommentTool = {
	name: "fizzy_create_comment",
	description: `Add a comment to a card.

Post a message or note on a task for discussion or documentation.

**When to use:**
1. Provide an update on task progress
2. Ask a question or add context to a task

**Arguments:** \`account_slug\` (optional), \`card_number\` (required), \`body\` (required — markdown auto-converted to HTML)

**Returns:** JSON with comment \`id\`, \`body\` (as markdown), \`creator\` info, \`created_at\`, \`updated_at\`, \`url\`.

**Related:** Attach files by including HTML from \`fizzy_attach_file\` in the body.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if omitted."),
		card_number: z.number().describe("Card number to comment on."),
		body: z
			.string()
			.describe(
				"Comment body in markdown. Auto-converted to HTML for storage.",
			),
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
			throw toUserError(result.error, {
				resourceType: "Comment",
				container: `card #${args.card_number}`,
			});
		}
		return formatComment(result.value);
	},
};

export const updateCommentTool = {
	name: "fizzy_update_comment",
	description: `Edit a comment on a card.

Modify an existing comment's content. Only the original author can edit.

**When to use:**
1. Fix typos or errors in a previous comment
2. Add clarification to an existing comment

**Don't use when:** You want to add new information — create a new comment instead for clearer history.

**Arguments:** \`account_slug\` (optional), \`card_number\` (required), \`comment_id\` (required — get from \`fizzy_list_comments\`), \`body\` (required — markdown)

**Returns:** JSON with updated comment details: \`id\`, \`body\`, \`creator\`, timestamps, \`url\`.

**Related:** Get comment IDs from \`fizzy_list_comments\` first.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if omitted."),
		card_number: z.number().describe("Card number the comment is on."),
		comment_id: z
			.string()
			.describe("Comment ID to update. Get from fizzy_list_comments."),
		body: z
			.string()
			.describe("New comment body in markdown. Replaces existing content."),
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
			throw toUserError(result.error, {
				resourceType: "Comment",
				resourceId: args.comment_id,
				container: `card #${args.card_number}`,
			});
		}
		return formatComment(result.value);
	},
};

export const deleteCommentTool = {
	name: "fizzy_delete_comment",
	description: `Delete a comment from a card permanently.

Remove an unwanted comment — this cannot be undone.

**When to use:**
1. Comment was posted in error
2. Remove spam or incorrect information

**Don't use when:** You want to revise content — use \`fizzy_update_comment\` instead.

**Arguments:** \`account_slug\` (optional), \`card_number\` (required), \`comment_id\` (required), \`force\`: true (required safety flag — prevents accidental deletion)

**Returns:** Confirmation message.

**Related:** Get comment IDs from \`fizzy_list_comments\` first. The \`force\` flag must be \`true\`.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if omitted."),
		card_number: z.number().describe("Card number the comment is on."),
		comment_id: z
			.string()
			.describe("Comment ID to delete. Get from fizzy_list_comments."),
		force: z
			.boolean()
			.describe(
				"Safety flag: must be true to confirm deletion. Prevents accidental deletes.",
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
			throw toUserError(result.error, {
				resourceType: "Comment",
				resourceId: args.comment_id,
				container: `card #${args.card_number}`,
			});
		}
		return `Comment ${args.comment_id} deleted from card #${args.card_number}.`;
	},
};
