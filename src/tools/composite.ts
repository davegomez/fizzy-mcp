import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import type { Card } from "../schemas/cards.js";
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

interface CreateCardFullFailure {
	operation: string;
	error: string;
}

interface CreateCardFullResult {
	card: { id: string; number: number; title: string; url: string };
	steps_created: number;
	tags_added: string[];
	assignees_added: string[];
	triaged_to: string | null;
	failures: CreateCardFullFailure[];
}

export const createCardFullTool = {
	name: "fizzy_create_card_full",
	description: `Create a card with steps, tags, assignees, and column in one call.
Full card setup in a single operation — card creation must succeed, other operations are best-effort.

**When to use:**
- Creating a well-defined task with all metadata (checklist, tags, assignees)
- Batch card creation with consistent structure

**Don't use when:** You only need a simple card — use \`fizzy_create_card\` for faster single operation.

**Arguments:**
- \`account_slug\` (optional) — uses default if not provided
- \`board_id\` (required) — board to create card on
- \`title\` (required, 1-500 chars) — card title
- \`description\` (optional) — markdown body
- \`steps\` (optional array of strings) — checklist items
- \`tags\` (optional array of strings) — tag titles to add (creates if missing)
- \`assignees\` (optional array of strings) — user IDs to assign
- \`column_id\` (optional) — triage to this column instead of inbox

**Returns:** JSON with \`card\` (id, number, title, url), \`steps_created\` count, \`tags_added\` array, \`assignees_added\` array, \`triaged_to\` (column ID or null), \`failures\` array for any failed secondary operations.
Example: \`{"card": {"id": "abc", "number": 42, "title": "...", "url": "..."}, "steps_created": 2, "tags_added": ["bug"], "assignees_added": [], "triaged_to": null, "failures": [{"operation": "toggle_tag:urgent", "error": "Tag not found"}]}\`

**Related:** Card creation is atomic — if it fails, nothing is created. Use \`card.number\` with other tools. Secondary operations report failures separately in the \`failures\` array.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug (uses default if omitted)."),
		board_id: z.string().describe("Board ID to create card on (required)."),
		title: z.string().describe("Card title, 1-500 characters (required)."),
		description: z
			.string()
			.optional()
			.describe("Card body in markdown (optional)."),
		steps: z
			.array(z.string())
			.optional()
			.describe("Checklist items as strings (optional)."),
		tags: z
			.array(z.string())
			.optional()
			.describe(
				"Tag titles to add — creates tags if they don't exist (optional).",
			),
		assignees: z
			.array(z.string())
			.optional()
			.describe("User IDs to assign to the card (optional)."),
		column_id: z
			.string()
			.optional()
			.describe("Column ID to triage card to instead of inbox (optional)."),
	}),
	execute: async (args: {
		account_slug?: string;
		board_id: string;
		title: string;
		description?: string;
		steps?: string[];
		tags?: string[];
		assignees?: string[];
		column_id?: string;
	}): Promise<string> => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const failures: CreateCardFullFailure[] = [];

		// Step 1: Create card (must succeed)
		const cardResult = await client.createCard(slug, args.board_id, {
			title: args.title,
			description: args.description,
		});
		if (isErr(cardResult)) {
			throw toUserError(cardResult.error, {
				resourceType: "Card",
				container: `board "${args.board_id}"`,
			});
		}
		const card = cardResult.value;

		// Step 2: Create steps (best-effort)
		let stepsCreated = 0;
		for (const content of args.steps ?? []) {
			const stepResult = await client.createStep(slug, card.number, {
				content,
			});
			if (isErr(stepResult)) {
				failures.push({
					operation: `add_step:${content}`,
					error: stepResult.error.message,
				});
			} else {
				stepsCreated++;
			}
		}

		// Step 3: Toggle tags (best-effort)
		const tagsAdded: string[] = [];
		for (const tagTitle of args.tags ?? []) {
			const tagResult = await client.toggleTag(slug, card.number, tagTitle);
			if (isErr(tagResult)) {
				failures.push({
					operation: `toggle_tag:${tagTitle}`,
					error: tagResult.error.message,
				});
			} else {
				tagsAdded.push(tagTitle);
			}
		}

		// Step 4: Toggle assignees (best-effort)
		const assigneesAdded: string[] = [];
		for (const userId of args.assignees ?? []) {
			const assigneeResult = await client.toggleAssignee(
				slug,
				card.number,
				userId,
			);
			if (isErr(assigneeResult)) {
				failures.push({
					operation: `toggle_assignee:${userId}`,
					error: assigneeResult.error.message,
				});
			} else {
				assigneesAdded.push(userId);
			}
		}

		// Step 5: Triage to column (best-effort if column_id provided)
		let triagedTo: string | null = null;
		if (args.column_id) {
			const triageResult = await client.triageCard(
				slug,
				card.number,
				args.column_id,
			);
			if (isErr(triageResult)) {
				failures.push({
					operation: `triage:${args.column_id}`,
					error: triageResult.error.message,
				});
			} else {
				triagedTo = args.column_id;
			}
		}

		const result: CreateCardFullResult = {
			card: {
				id: card.id,
				number: card.number,
				title: card.title,
				url: card.url,
			},
			steps_created: stepsCreated,
			tags_added: tagsAdded,
			assignees_added: assigneesAdded,
			triaged_to: triagedTo,
			failures,
		};

		return JSON.stringify(result, null, 2);
	},
};

interface BulkCloseResult {
	closed: number[];
	failed: Array<{ card_number: number; error: string }>;
	total: number;
	success_count: number;
}

async function getTagIdByTitle(
	accountSlug: string,
	tagTitle: string,
): Promise<string | null> {
	const client = getFizzyClient();
	const result = await client.listTags(accountSlug);
	if (isErr(result)) {
		return null;
	}
	const tag = result.value.items.find(
		(t) => t.title.toLowerCase() === tagTitle.toLowerCase(),
	);
	return tag?.id ?? null;
}

function isCardOlderThan(card: Card, days: number): boolean {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);
	const updatedAt = new Date(card.updated_at);
	return updatedAt < cutoffDate;
}

export const bulkCloseCardsTool = {
	name: "fizzy_bulk_close_cards",
	description: `Close multiple cards at once.
Batch close cards by explicit list or filters — requires confirmation.

**When to use:**
- Closing all cards in a completed column
- Cleaning up old cards by age (e.g., stale items)

**Don't use when:** Closing a single card — use \`fizzy_close_card\` for simpler operation.

**Arguments:**
- \`account_slug\` (optional) — uses default if not provided
- \`card_numbers\` (optional array) — explicit list of card numbers to close
- \`column_id\` (optional) — filter: close cards in this column
- \`tag_title\` (optional) — filter: close cards with this tag
- \`older_than_days\` (optional number) — filter: close cards not updated in N days
- \`force\` (required, must be true) — confirmation flag to execute

Provide either \`card_numbers\` OR at least one filter. Filters AND together (column + tag = cards matching both). Only closes open cards.

**Returns:** JSON with \`closed\` array (card numbers), \`failed\` array ({card_number, error}), \`total\` count, \`success_count\`.
Example: \`{"closed": [1, 2, 3], "failed": [], "total": 3, "success_count": 3}\`

**Related:** Test filters with \`fizzy_list_cards\` first to preview what would be closed. Use \`fizzy_reopen_card\` to undo individual closes.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug (uses default if omitted)."),
		card_numbers: z
			.array(z.number())
			.optional()
			.describe("Explicit card numbers to close (optional, or use filters)."),
		column_id: z
			.string()
			.optional()
			.describe("Filter: close open cards in this column (optional)."),
		tag_title: z
			.string()
			.optional()
			.describe("Filter: close open cards with this tag title (optional)."),
		older_than_days: z
			.number()
			.optional()
			.describe("Filter: close cards not updated in N days (optional)."),
		force: z
			.boolean()
			.describe("Confirmation flag — must be true to execute (required)."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_numbers?: number[];
		column_id?: string;
		tag_title?: string;
		older_than_days?: number;
		force: boolean;
	}): Promise<string> => {
		if (args.force !== true) {
			throw new UserError("Bulk close requires force: true");
		}

		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();

		let targetCardNumbers: number[];

		if (args.card_numbers && args.card_numbers.length > 0) {
			// Explicit card numbers provided
			targetCardNumbers = args.card_numbers;
		} else {
			// Use filters to find cards
			const hasFilters =
				args.column_id || args.tag_title || args.older_than_days !== undefined;
			if (!hasFilters) {
				throw new UserError(
					"Must provide card_numbers or at least one filter (column_id, tag_title, older_than_days)",
				);
			}

			// Build filters for listCards
			const filters: {
				column_id?: string;
				tag_ids?: string[];
				status?: "open";
			} = {
				status: "open", // Only close open cards
			};

			if (args.column_id) {
				filters.column_id = args.column_id;
			}

			if (args.tag_title) {
				const tagId = await getTagIdByTitle(slug, args.tag_title);
				if (!tagId) {
					throw new UserError(`Tag "${args.tag_title}" not found`);
				}
				filters.tag_ids = [tagId];
			}

			const listResult = await client.listCards(slug, filters);
			if (isErr(listResult)) {
				throw toUserError(listResult.error, {
					resourceType: "Card",
					container: `account "${slug}"`,
				});
			}

			let cards = listResult.value.items;

			// Apply age filter client-side
			if (args.older_than_days !== undefined) {
				cards = cards.filter((card) =>
					isCardOlderThan(card, args.older_than_days as number),
				);
			}

			targetCardNumbers = cards.map((c) => c.number);
		}

		if (targetCardNumbers.length === 0) {
			const result: BulkCloseResult = {
				closed: [],
				failed: [],
				total: 0,
				success_count: 0,
			};
			return JSON.stringify(result, null, 2);
		}

		// Close each card, collecting results
		const closed: number[] = [];
		const failed: Array<{ card_number: number; error: string }> = [];

		for (const cardNumber of targetCardNumbers) {
			const closeResult = await client.closeCard(slug, cardNumber);
			if (isErr(closeResult)) {
				failed.push({
					card_number: cardNumber,
					error: closeResult.error.message,
				});
			} else {
				closed.push(cardNumber);
			}
		}

		const result: BulkCloseResult = {
			closed,
			failed,
			total: targetCardNumbers.length,
			success_count: closed.length,
		};

		return JSON.stringify(result, null, 2);
	},
};
