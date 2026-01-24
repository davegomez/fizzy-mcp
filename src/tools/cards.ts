import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { htmlToMarkdown } from "../client/markdown.js";
import type { Card, CardStatus } from "../schemas/cards.js";
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

function formatCard(card: Card): string {
	const description = card.description_html
		? htmlToMarkdown(card.description_html)
		: null;
	return JSON.stringify(
		{
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
		},
		null,
		2,
	);
}

export const listCardsTool = {
	name: "fizzy_list_cards",
	description: `List cards in an account with optional filters.
Find cards matching criteria or review board/column contents.

**When to use:**
- Find cards by status, tag, assignee, or location
- Review what's on a board or in a column

**Don't use when:** You already know the card number - use \`fizzy_get_card\` for full details.

**Arguments:**
\`account_slug\` (optional), \`board_id\` (optional), \`column_id\` (optional), \`tag_ids\` (optional array), \`assignee_ids\` (optional array), \`status\`: open | closed | deferred (optional). Filters AND together.
\`limit\` (optional): Max items, 1-100 (default: 25). \`cursor\` (optional): Continuation cursor from previous response.

**Returns:** JSON with items and pagination metadata.
\`\`\`json
{"items": [{"number": 42, "title": "...", ...}], "pagination": {"returned": 25, "has_more": true, "next_cursor": "..."}}
\`\`\`
Pass \`next_cursor\` to get the next page. Cursor encodes filter state, so keep filters consistent.

**Related:** Use card number with \`fizzy_get_card\` for full details.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe(
				"Account slug (e.g., 'acme-corp'). Uses session default if omitted.",
			),
		board_id: z
			.string()
			.optional()
			.describe("Filter to cards on this board ID."),
		column_id: z
			.string()
			.optional()
			.describe("Filter to cards in this column ID."),
		tag_ids: z
			.array(z.string())
			.optional()
			.describe("Filter to cards with ALL these tag IDs."),
		assignee_ids: z
			.array(z.string())
			.optional()
			.describe("Filter to cards assigned to ANY of these user IDs."),
		status: z
			.enum(["open", "closed", "deferred"])
			.optional()
			.describe("Filter by card status: open | closed | deferred."),
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
		board_id?: string;
		column_id?: string;
		tag_ids?: string[];
		assignee_ids?: string[];
		status?: CardStatus;
		limit: number;
		cursor?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listCards(
			slug,
			{
				board_id: args.board_id,
				column_id: args.column_id,
				tag_ids: args.tag_ids,
				assignee_ids: args.assignee_ids,
				status: args.status,
			},
			{ limit: args.limit, cursor: args.cursor },
		);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Card",
				container: `account "${slug}"`,
			});
		}
		return JSON.stringify(result.value, null, 2);
	},
};

export const getCardTool = {
	name: "fizzy_get_card",
	description: `Get full details of a card by its number.
Retrieve complete card data including description, steps count, and metadata.

**When to use:**
- Need full description or metadata for a specific card
- Check step completion status or see all tags/assignees

**Don't use when:** Scanning multiple cards - use \`fizzy_list_cards\` first.

**Arguments:**
\`account_slug\` (optional, uses session default), \`card_number\` (required) - the \`#\` number from URLs/lists.

**Returns:**
JSON with id, number, title, description (markdown), status, board_id, column_id, tags array, assignees array, steps_count, completed_steps_count, comments_count, url, created_at, updated_at, closed_at (null if open).
Example: \`{"id": "card_abc", "number": 42, "title": "Fix bug", "status": "open", "steps_count": 3, ...}\`

**Related:** Use \`fizzy_list_comments\` or \`fizzy_create_step\` for deeper interaction.`,
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
	}),
	execute: async (args: { account_slug?: string; card_number: number }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.getCard(slug, args.card_number);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Card",
				resourceId: `#${args.card_number}`,
				container: `account "${slug}"`,
			});
		}
		return formatCard(result.value);
	},
};

export const createCardTool = {
	name: "fizzy_create_card",
	description: `Create a new card on a board.
Add a task or work item to track.

**When to use:**
- Create a single card with title and optional description
- Quick card creation without tags/steps/assignees

**Don't use when:** You need tags, steps, or assignees at creation - use \`fizzy_create_card_full\` instead.

**Arguments:**
\`account_slug\` (optional, uses session default), \`board_id\` (required), \`title\` (required, 1-500 chars), \`description\` (optional, markdown auto-converted to HTML).

**Returns:**
JSON with id, number, title, url of created card.
Example: \`{"id": "card_xyz", "number": 43, "title": "New task", "url": "https://..."}\`

**Related:** Card lands in inbox. Use \`fizzy_triage_card\` to move to a column.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe(
				"Account slug (e.g., 'acme-corp'). Uses session default if omitted.",
			),
		board_id: z.string().describe("Board ID to create the card on."),
		title: z.string().describe("Card title (1-500 characters)."),
		description: z
			.string()
			.optional()
			.describe("Card description in markdown (auto-converted to HTML)."),
	}),
	execute: async (args: {
		account_slug?: string;
		board_id: string;
		title: string;
		description?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.createCard(slug, args.board_id, {
			title: args.title,
			description: args.description,
		});
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Card",
				container: `board "${args.board_id}"`,
			});
		}
		const card = result.value;
		return JSON.stringify(
			{
				id: card.id,
				number: card.number,
				title: card.title,
				url: card.url,
			},
			null,
			2,
		);
	},
};

export const updateCardTool = {
	name: "fizzy_update_card",
	description: `Update a card's title and/or description.
Modify card content without changing status or location.

**When to use:**
- Fix typos or update the title
- Expand or revise the description

**Don't use when:** Changing status (use close/reopen), location (use triage), or tags (use toggle_tag).

**Arguments:**
\`account_slug\` (optional, uses session default), \`card_number\` (required), \`title\` (optional), \`description\` (optional, markdown auto-converted).

**Returns:**
JSON with full updated card details (same format as \`fizzy_get_card\`).`,
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
		title: z.string().optional().describe("New title (1-500 characters)."),
		description: z
			.string()
			.optional()
			.describe("New description in markdown (auto-converted to HTML)."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		title?: string;
		description?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.updateCard(slug, args.card_number, {
			title: args.title,
			description: args.description,
		});
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Card",
				resourceId: `#${args.card_number}`,
				container: `account "${slug}"`,
			});
		}
		return formatCard(result.value);
	},
};

export const deleteCardTool = {
	name: "fizzy_delete_card",
	description: `Permanently delete a card by number.
Remove a card and all its data (comments, steps).

**When to use:**
- Remove duplicate or spam cards
- Clean up test data

**Don't use when:** Card should be archived for history - use \`fizzy_close_card\` instead.

**Arguments:**
\`account_slug\` (optional, uses session default), \`card_number\` (required).

**Returns:**
Confirmation message: \`"Card #42 deleted."\`

**Related:** This is permanent. Consider \`fizzy_close_card\` to preserve history.`,
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
	}),
	execute: async (args: { account_slug?: string; card_number: number }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.deleteCard(slug, args.card_number);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Card",
				resourceId: `#${args.card_number}`,
				container: `account "${slug}"`,
			});
		}
		return `Card #${args.card_number} deleted.`;
	},
};
