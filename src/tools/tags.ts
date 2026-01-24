import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
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

export const listTagsTool = {
	name: "fizzy_list_tags",
	description: `List tags in the account.
Get available tag titles for filtering cards or toggling on cards.

**Note:** Tags are account-level, not board-level. All boards in an account share the same tag set.

**When to use:**
1. Discover available tags before filtering cards with \`fizzy_list_cards\`
2. Find exact tag title for \`fizzy_toggle_tag\`

**Arguments:**
- \`account_slug\` (optional) — defaults to session account
- \`limit\` (optional): Max items to return, 1-100 (default: 25)
- \`cursor\` (optional): Continuation cursor from previous response

**Returns:** JSON with items and pagination metadata.
\`\`\`json
{"items": [{"id": "...", "title": "bug", "color": "red"}, ...], "pagination": {"returned": 3, "has_more": false}}
\`\`\`
Pass \`next_cursor\` to get the next page.

**Related:**
- Use tag **title** (not ID) with \`fizzy_toggle_tag\` to add/remove from cards
- Use tag **ID** with \`fizzy_list_cards\` \`tag_id\` filter`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe(
				"Account slug. Defaults to session account. Tags are account-level.",
			),
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
		const result = await client.listTags(slug, {
			limit: args.limit,
			cursor: args.cursor,
		});
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Tag",
				container: `account "${slug}"`,
			});
		}
		return JSON.stringify(result.value, null, 2);
	},
};
