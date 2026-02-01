import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { htmlToMarkdown } from "../client/markdown.js";
import type { Comment } from "../schemas/comments.js";
import { resolveAccount } from "../state/account-resolver.js";
import { isErr } from "../types/result.js";

function formatComment(comment: Comment) {
	return {
		id: comment.id,
		body: htmlToMarkdown(comment.body.html),
		creator: {
			id: comment.creator.id,
			name: comment.creator.name,
		},
		created_at: comment.created_at,
		updated_at: comment.updated_at,
		url: comment.url,
	};
}

export const commentTool = {
	name: "fizzy_comment",
	description: `Manage comments on a card: create, list, update, or delete.

**Actions:**
- \`create\` (default): Post a new comment
- \`list\`: Get all comments on a card
- \`update\`: Edit an existing comment (requires \`comment_id\` + \`body\`)
- \`delete\`: Remove a comment (requires \`comment_id\`)

**Arguments:**
- \`action\` (optional): "create" | "list" | "update" | "delete" (default: "create")
- \`account_slug\` (optional): Uses session default if omitted
- \`card_number\` (required): Card number
- \`comment_id\` (optional): Required for update/delete
- \`body\` (optional): Comment body in markdown. Required for create/update

**Returns:** JSON with comment details, list of comments, or deletion confirmation.`,
	parameters: z.object({
		action: z
			.enum(["create", "list", "update", "delete"])
			.default("create")
			.describe("Action to perform."),
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if omitted."),
		card_number: z.number().describe("Card number."),
		comment_id: z
			.string()
			.optional()
			.describe("Comment ID. Required for update/delete."),
		body: z
			.string()
			.optional()
			.describe(
				"Comment body in markdown (1-10000 chars). Required for create/update.",
			),
	}),
	execute: async (args: {
		action?: string;
		account_slug?: string;
		card_number: number;
		comment_id?: string;
		body?: string;
	}) => {
		const action = args.action ?? "create";
		const slug = await resolveAccount(args.account_slug);
		const client = getFizzyClient();

		switch (action) {
			case "create": {
				if (!args.body) {
					throw new UserError("Create requires body. Provide comment text.");
				}
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
				return JSON.stringify(formatComment(result.value), null, 2);
			}

			case "list": {
				const result = await client.listComments(slug, args.card_number);
				if (isErr(result)) {
					throw toUserError(result.error, {
						resourceType: "Comment",
						container: `card #${args.card_number}`,
					});
				}
				return JSON.stringify(
					{
						comments: result.value.items.map(formatComment),
						pagination: result.value.pagination,
					},
					null,
					2,
				);
			}

			case "update": {
				if (!args.comment_id) {
					throw new UserError(
						"Update requires comment_id. Specify which comment to edit.",
					);
				}
				if (!args.body) {
					throw new UserError(
						"Update requires body. Provide new comment text.",
					);
				}
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
				return JSON.stringify(formatComment(result.value), null, 2);
			}

			case "delete": {
				if (!args.comment_id) {
					throw new UserError(
						"Delete requires comment_id. Specify which comment to remove.",
					);
				}
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
				return JSON.stringify(
					{
						comment_id: args.comment_id,
						deleted: true,
					},
					null,
					2,
				);
			}

			default:
				throw new UserError(`Unknown action: ${action}`);
		}
	},
};
