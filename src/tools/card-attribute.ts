import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { htmlToMarkdown } from "../client/markdown.js";
import type { Card } from "../schemas/cards.js";
import { getDefaultAccount } from "../state/session.js";
import { isErr } from "../types/result.js";

const attributes = ["tag", "assignee"] as const;
const operations = ["add", "remove"] as const;

function resolveAccount(accountSlug?: string): string {
	const slug = (accountSlug || getDefaultAccount())?.replace(/^\//, "");
	if (!slug) {
		throw new UserError(
			"No account specified and no default set. Use fizzy_set_default_account first.",
		);
	}
	return slug;
}

function formatCard(card: Card): object {
	const description = card.description_html
		? htmlToMarkdown(card.description_html)
		: null;
	return {
		id: card.id,
		number: card.number,
		title: card.title,
		description,
		status: card.status,
		board_id: card.board_id,
		column_id: card.column_id,
		tags: card.tags,
		assignees: card.assignees,
		steps_count: card.steps_count,
		completed_steps_count: card.completed_steps_count,
		comments_count: card.comments_count,
		url: card.url,
		created_at: card.created_at,
		updated_at: card.updated_at,
		closed_at: card.closed_at,
	};
}

export const toggleCardAttributeTool = {
	name: "fizzy_toggle_card_attribute",
	description: `Add or remove a tag or assignee from a card.
Explicitly specify the operation to avoid ambiguity of toggle behavior.

**When to use:**
- Categorize a card with a tag label
- Assign work to a team member
- Remove a tag or assignee from a card

**Don't use when:** Changing card status - use \`fizzy_close_card\`, \`fizzy_reopen_card\`, or \`fizzy_not_now_card\`.

**Arguments:**
- \`account_slug\` (optional) — uses session default if omitted
- \`card_number\` (required) — the # number from URLs/lists
- \`attribute\`: "tag" | "assignee" (required)
- \`operation\`: "add" | "remove" (required)
- \`tag_title\` (required when attribute="tag") — the tag name, not ID
- \`user_id\` (required when attribute="assignee") — user ID to assign/unassign

**Returns:**
JSON with action performed, attribute type, and full card object showing updated state.
Example: \`{"action": "add", "attribute": "tag", "card": {...}}\`

**Related:**
- Use \`fizzy_list_tags\` to find available tag names
- Use \`fizzy_whoami\` to find user IDs from account members`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe(
				"Account slug (e.g., 'acme-corp'). Uses session default if omitted.",
			),
		card_number: z
			.number()
			.describe("Card number (the # from URLs/lists, e.g., 42)."),
		attribute: z
			.enum(attributes)
			.describe("Attribute type to modify: tag | assignee."),
		operation: z
			.enum(operations)
			.describe("Operation to perform: add | remove."),
		tag_title: z
			.string()
			.optional()
			.describe("Tag name (required when attribute='tag'). Use fizzy_list_tags to find names."),
		user_id: z
			.string()
			.optional()
			.describe("User ID (required when attribute='assignee'). Use fizzy_whoami to find IDs."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		attribute: (typeof attributes)[number];
		operation: (typeof operations)[number];
		tag_title?: string;
		user_id?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();

		// Validate required fields based on attribute type
		if (args.attribute === "tag" && !args.tag_title) {
			throw new UserError(
				"Attribute 'tag' requires tag_title. Use fizzy_list_tags to find tag names.",
			);
		}
		if (args.attribute === "assignee" && !args.user_id) {
			throw new UserError(
				"Attribute 'assignee' requires user_id. Use fizzy_whoami to find user IDs.",
			);
		}

		// Fetch current card state for pre-check
		const cardResult = await client.getCard(slug, args.card_number);
		if (isErr(cardResult)) {
			throw toUserError(cardResult.error);
		}
		const card = cardResult.value;

		// Pre-check: validate operation is valid for current state
		if (args.attribute === "tag") {
			const tagTitle = args.tag_title as string;
			const hasTag = card.tags.some((t) => t.title === tagTitle);
			const currentTags = card.tags.map((t) => t.title).join(", ") || "none";

			if (args.operation === "add" && hasTag) {
				throw new UserError(
					`Tag '${tagTitle}' already on card #${args.card_number}. Current tags: [${currentTags}]`,
				);
			}
			if (args.operation === "remove" && !hasTag) {
				throw new UserError(
					`Tag '${tagTitle}' not on card #${args.card_number}. Current tags: [${currentTags}]`,
				);
			}

			// Perform toggle (API toggle matches our intent after pre-check)
			const toggleResult = await client.toggleTag(slug, args.card_number, tagTitle);
			if (isErr(toggleResult)) {
				throw toUserError(toggleResult.error);
			}
		} else {
			const userId = args.user_id as string;
			const hasAssignee = card.assignees.some((a) => a.id === userId);
			const currentAssignees = card.assignees.map((a) => `${a.name} (${a.id})`).join(", ") || "none";

			if (args.operation === "add" && hasAssignee) {
				throw new UserError(
					`User ${userId} already assigned to card #${args.card_number}. Current assignees: [${currentAssignees}]`,
				);
			}
			if (args.operation === "remove" && !hasAssignee) {
				throw new UserError(
					`User ${userId} not assigned to card #${args.card_number}. Current assignees: [${currentAssignees}]`,
				);
			}

			// Perform toggle (API toggle matches our intent after pre-check)
			const toggleResult = await client.toggleAssignee(slug, args.card_number, userId);
			if (isErr(toggleResult)) {
				throw toUserError(toggleResult.error);
			}
		}

		// Re-fetch card to get updated state
		const updatedCardResult = await client.getCard(slug, args.card_number);
		if (isErr(updatedCardResult)) {
			throw toUserError(updatedCardResult.error);
		}

		return JSON.stringify(
			{
				action: args.operation,
				attribute: args.attribute,
				card: formatCard(updatedCardResult.value),
			},
			null,
			2,
		);
	},
};
