import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { DEFAULT_LIMIT } from "../schemas/pagination.js";
import { getDefaultAccount } from "../state/session.js";
import { isErr } from "../types/result.js";

function resolveAccount(accountSlug?: string): string {
	// Strip leading slash to normalize URLs pasted directly from Fizzy
	const slug = (accountSlug || getDefaultAccount())?.replace(/^\//, "");
	if (!slug) {
		throw new UserError(
			"No account specified and no default set. Use fizzy_default_account first.",
		);
	}
	return slug;
}

export const boardsTool = {
	name: "fizzy_boards",
	description: `List boards in the account with column summaries.

Get an overview of boards and their column structure including card counts.

**When to use:**
- Discover board IDs and column IDs for subsequent operations
- See card counts per column across all boards
- Find the right board/column to create cards or triage

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`limit\` (optional): Max items to return, 1-100 (default: 25)
- \`cursor\` (optional): Continuation cursor from previous response

**Returns:** JSON with items and pagination metadata.
\`\`\`json
{"items": [{"id": "board_1", "name": "Project", "columns": [{"id": "col_1", "name": "Backlog"}]}], "pagination": {...}}
\`\`\`

**Related:** Use board ID with \`fizzy_task\` to create cards. Use column IDs for triage.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses session default if omitted."),
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
		limit: number;
		cursor?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listBoards(slug, {
			limit: args.limit,
			cursor: args.cursor,
		});
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Board",
				container: `account "${slug}"`,
			});
		}
		return JSON.stringify(result.value, null, 2);
	},
};
