import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { htmlToMarkdown } from "../client/markdown.js";
import type { Comment } from "../schemas/comments.js";
import { resolveAccount } from "../state/account-resolver.js";
import { isErr } from "../types/result.js";

function formatComment(comment: Comment): string {
	// Convert HTML to markdown for LLM-friendly output
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

export const commentTool = {
	name: "fizzy_comment",
	description: `Add a comment to a card.

Post a message or note on a task for discussion or documentation.

**When to use:**
- Provide an update on task progress
- Ask a question or add context to a task

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`card_number\` (required): Card number to comment on
- \`body\` (required): Comment body in markdown (1-10000 chars)

**Returns:** JSON with comment \`id\`, \`body\` (as markdown), \`creator\` info, timestamps, \`url\`.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if omitted."),
		card_number: z.number().describe("Card number to comment on."),
		body: z
			.string()
			.describe(
				"Comment body in markdown (1-10000 chars). Auto-converted to HTML.",
			),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		body: string;
	}) => {
		const slug = await resolveAccount(args.account_slug);
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
