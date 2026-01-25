import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import type { Card } from "../schemas/cards.js";
import { resolveAccount } from "../state/account-resolver.js";
import { isErr } from "../types/result.js";

interface BulkCloseResult {
	closed: number[];
	failed: Array<{ card_number: number; error: string }>;
	total: number;
	success_count: number;
}

// Fizzy API requires tag IDs but users think in tag titles
async function getTagIdByTitle(
	accountSlug: string,
	tagTitle: string,
): Promise<string | null> {
	const client = getFizzyClient();
	const result = await client.listTags(accountSlug);
	if (isErr(result)) {
		return null;
	}
	// Case-insensitive match for user convenience
	const tag = result.value.items.find(
		(t) => t.title.toLowerCase() === tagTitle.toLowerCase(),
	);
	return tag?.id ?? null;
}

// Fizzy API doesn't support age-based filtering, so we filter client-side
function isCardOlderThan(card: Card, days: number): boolean {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);
	const updatedAt = new Date(card.updated_at);
	return updatedAt < cutoffDate;
}

export const bulkCloseCardsTool = {
	name: "fizzy_bulk_close",
	description: `Close multiple cards at once.
Batch close cards by explicit list or filters — requires confirmation.

**When to use:**
- Closing all cards in a completed column
- Cleaning up old cards by age (e.g., stale items)

**Don't use when:** Closing a single card — use \`fizzy_task\` with \`status: "closed"\` instead.

**Arguments:**
- \`account_slug\` (optional): Uses default if not provided
- \`card_numbers\` (optional): Explicit list of card numbers to close
- \`column_id\` (optional): Filter: close cards in this column
- \`tag_title\` (optional): Filter: close cards with this tag
- \`older_than_days\` (optional): Filter: close cards not updated in N days
- \`force\` (required, must be true): Confirmation flag to execute

Provide either \`card_numbers\` OR at least one filter. Filters AND together. Only closes open cards.

**Returns:** JSON with \`closed\` array (card numbers), \`failed\` array, \`total\`, \`success_count\`.

**Related:** Test filters with \`fizzy_search\` first to preview what would be closed.`,
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
		// Require explicit confirmation to prevent accidental mass operations
		if (args.force !== true) {
			throw new UserError("Bulk close requires force: true");
		}

		const slug = await resolveAccount(args.account_slug);
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
			// Default search excludes closed cards, which is what we want
			const filters: {
				tag_ids?: string[];
			} = {};

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

			// Filter out already-closed cards (API default excludes them but be explicit)
			cards = cards.filter((card) => !card.closed);

			// Apply column_id filter client-side (API doesn't support it)
			if (args.column_id) {
				cards = cards.filter((card) => card.column_id === args.column_id);
			}

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

		// Close sequentially to avoid rate limits; collect partial results on failure
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
