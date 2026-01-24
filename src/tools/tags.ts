import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import type { Tag } from "../schemas/tags.js";
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

function formatTagList(tags: Tag[]): string {
	if (tags.length === 0) {
		return "No tags found.";
	}
	return tags.map((t) => `${t.title} (${t.color})`).join("\n");
}

export const listTagsTool = {
	name: "fizzy_list_tags",
	description: `List all tags in the account.
Get available tag titles for filtering cards or toggling on cards.

**Note:** Tags are account-level, not board-level. All boards in an account share the same tag set.

**When to use:**
1. Discover available tags before filtering cards with \`fizzy_list_cards\`
2. Find exact tag title for \`fizzy_toggle_tag\`

**Arguments:**
- \`account_slug\` (optional) — defaults to session account

**Returns:** Formatted list with tag title and color.
Example: "bug (red)\\nfeature (blue)\\nurgent (orange)"

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
	}),
	execute: async (args: { account_slug?: string }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listTags(slug);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Tag",
				container: `account "${slug}"`,
			});
		}
		return formatTagList(result.value);
	},
};
