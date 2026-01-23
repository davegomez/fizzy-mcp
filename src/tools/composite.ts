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
	description:
		"Create a card with steps, tags, assignees, and column in one call. Card creation must succeed; other operations are best-effort. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		board_id: z.string().describe("Board ID to create the card on."),
		title: z.string().describe("Card title."),
		description: z
			.string()
			.optional()
			.describe("Card description (markdown supported)."),
		steps: z
			.array(z.string())
			.optional()
			.describe("Checklist items to add to the card."),
		tags: z.array(z.string()).optional().describe("Tag titles to add."),
		assignees: z.array(z.string()).optional().describe("User IDs to assign."),
		column_id: z
			.string()
			.optional()
			.describe("Column ID to triage the card to."),
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
			throw toUserError(cardResult.error);
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
	const tag = result.value.find(
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
	description:
		"Close multiple cards at once. Provide explicit card_numbers OR use filters (column_id, tag_title, older_than_days). Filters AND together. Requires force: true to execute.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_numbers: z
			.array(z.number())
			.optional()
			.describe("Explicit list of card numbers to close."),
		column_id: z.string().optional().describe("Filter: close cards in column."),
		tag_title: z
			.string()
			.optional()
			.describe("Filter: close cards with this tag."),
		older_than_days: z
			.number()
			.optional()
			.describe("Filter: close cards not updated in N days."),
		force: z.boolean().describe("Required confirmation. Must be true."),
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
				throw toUserError(listResult.error);
			}

			let cards = listResult.value;

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
