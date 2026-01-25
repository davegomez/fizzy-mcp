import { UserError } from "fastmcp";
import { z } from "zod";
import type { FizzyApiError } from "../client/errors.js";
import { getFizzyClient, toUserError } from "../client/index.js";
import type { Card } from "../schemas/cards.js";
import { getDefaultAccount } from "../state/session.js";
import { isErr, type Result } from "../types/result.js";

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

interface TaskFailure {
	operation: string;
	error: string;
}

interface TaskOperations {
	title_updated?: boolean;
	description_updated?: boolean;
	status_changed?: string;
	triaged_to?: string | null;
	tags_added?: string[];
	tags_removed?: string[];
	steps_created?: number;
}

interface TaskResult {
	mode: "create" | "update";
	card: {
		id: string;
		number: number;
		title: string;
		url: string;
		status: string;
	};
	operations: TaskOperations;
	failures: TaskFailure[];
}

export const taskTool = {
	name: "fizzy_task",
	description: `Create or update a card with full control over status, tags, steps, and column placement.

**Mode detection:**
- \`card_number\` absent → CREATE mode (requires \`board_id\` + \`title\`)
- \`card_number\` present → UPDATE mode

**Create mode:**
Creates card, then best-effort: adds steps, toggles tags, triages to column.

**Update mode:**
Updates title/description if provided. Changes status (open/closed/not_now). Manages tags with add/remove. Moves card to column (from inbox or another column). Same-column moves are skipped.

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`card_number\` (optional): Card to update. Omit to create new card.
- \`board_id\` (optional): Board ID. Required for create mode.
- \`title\` (optional): Card title. Required for create mode.
- \`description\` (optional): Card body in markdown
- \`status\` (optional): open | closed | not_now — changes card lifecycle state
- \`column_id\` (optional): Move card to this column (works from inbox or other columns; skipped if already there)
- \`position\` (optional): top | bottom (default: bottom) — position in column
- \`add_tags\` (optional): Tag titles to add
- \`remove_tags\` (optional): Tag titles to remove
- \`steps\` (optional): Checklist items to create (create mode only)

**Returns:**
JSON with \`mode\`, \`card\` (id, number, title, url, status), \`operations\` summary, \`failures\` array.

**Examples:**
Create: \`{board_id: "...", title: "New task", steps: ["Step 1", "Step 2"]}\`
Update: \`{card_number: 42, status: "closed", add_tags: ["done"]}\``,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses session default if omitted."),
		card_number: z
			.number()
			.optional()
			.describe("Card number to update. Omit to create a new card."),
		board_id: z
			.string()
			.optional()
			.describe("Board ID. Required when creating a new card."),
		title: z
			.string()
			.optional()
			.describe("Card title (1-500 chars). Required when creating."),
		description: z
			.string()
			.optional()
			.describe("Card body in markdown (max 10000 chars)."),
		status: z
			.enum(["open", "closed", "not_now"])
			.optional()
			.describe("Card status: open | closed | not_now."),
		column_id: z.string().optional().describe("Column ID to triage card to."),
		position: z
			.enum(["top", "bottom"])
			.default("bottom")
			.describe("Position in column: top | bottom (default: bottom)."),
		add_tags: z
			.array(z.string())
			.optional()
			.describe("Tag titles to add to the card."),
		remove_tags: z
			.array(z.string())
			.optional()
			.describe("Tag titles to remove from the card."),
		steps: z
			.array(z.string())
			.optional()
			.describe("Checklist steps to create (create mode only)."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number?: number;
		board_id?: string;
		title?: string;
		description?: string;
		status?: "open" | "closed" | "not_now";
		column_id?: string;
		position: "top" | "bottom";
		add_tags?: string[];
		remove_tags?: string[];
		steps?: string[];
	}): Promise<string> => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const failures: TaskFailure[] = [];
		const operations: TaskOperations = {};

		// Mode detection: presence of card_number determines update vs create
		const isCreateMode = args.card_number === undefined;

		let card: Card;

		if (isCreateMode) {
			if (!args.board_id) {
				throw new UserError("Create mode requires board_id.");
			}
			if (!args.title) {
				throw new UserError("Create mode requires title.");
			}

			const createResult = await client.createCard(slug, args.board_id, {
				title: args.title,
				description: args.description,
			});
			if (isErr(createResult)) {
				throw toUserError(createResult.error, {
					resourceType: "Card",
					container: `board "${args.board_id}"`,
				});
			}
			card = createResult.value;

			// Best-effort: secondary operations don't fail the whole request
			if (args.steps && args.steps.length > 0) {
				let stepsCreated = 0;
				for (const content of args.steps) {
					const stepResult = await client.createStep(slug, card.number, {
						content,
					});
					if (isErr(stepResult)) {
						failures.push({
							operation: `create_step:${content}`,
							error: stepResult.error.message,
						});
					} else {
						stepsCreated++;
					}
				}
				operations.steps_created = stepsCreated;
			}

			if (args.add_tags && args.add_tags.length > 0) {
				const tagsAdded: string[] = [];
				for (const tagTitle of args.add_tags) {
					const tagResult = await client.toggleTag(slug, card.number, tagTitle);
					if (isErr(tagResult)) {
						failures.push({
							operation: `add_tag:${tagTitle}`,
							error: tagResult.error.message,
						});
					} else {
						tagsAdded.push(tagTitle);
					}
				}
				if (tagsAdded.length > 0) {
					operations.tags_added = tagsAdded;
				}
			}

			if (args.column_id) {
				const triageResult = await client.triageCard(
					slug,
					card.number,
					args.column_id,
					args.position,
				);
				if (isErr(triageResult)) {
					failures.push({
						operation: `triage:${args.column_id}`,
						error: triageResult.error.message,
					});
				} else {
					operations.triaged_to = args.column_id;
				}
			}
		} else {
			const cardNumber = args.card_number as number;

			// Fetch current state to enable idempotent tag operations
			const getResult = await client.getCard(slug, cardNumber);
			if (isErr(getResult)) {
				throw toUserError(getResult.error, {
					resourceType: "Card",
					resourceId: `#${cardNumber}`,
					container: `account "${slug}"`,
				});
			}
			card = getResult.value;

			// Update title/description if provided
			if (args.title !== undefined || args.description !== undefined) {
				const updateResult = await client.updateCard(slug, cardNumber, {
					title: args.title,
					description: args.description,
				});
				if (isErr(updateResult)) {
					failures.push({
						operation: "update_card",
						error: updateResult.error.message,
					});
				} else {
					card = updateResult.value;
					if (args.title !== undefined) operations.title_updated = true;
					if (args.description !== undefined)
						operations.description_updated = true;
				}
			}

			// Map user-facing status names to Fizzy API lifecycle methods
			// These methods may return void or Card, so we update local card state manually
			if (args.status !== undefined) {
				const currentStatus = card.status;
				let statusResult: Result<unknown, FizzyApiError> | undefined;

				if (args.status === "closed" && currentStatus !== "closed") {
					statusResult = await client.closeCard(slug, cardNumber);
					if (!isErr(statusResult)) {
						card = { ...card, status: "closed" };
						operations.status_changed = "closed";
					}
				} else if (args.status === "open" && currentStatus !== "open") {
					statusResult = await client.reopenCard(slug, cardNumber);
					if (!isErr(statusResult)) {
						card = { ...card, status: "open" };
						operations.status_changed = "open";
					}
				} else if (args.status === "not_now" && currentStatus !== "deferred") {
					statusResult = await client.notNowCard(slug, cardNumber);
					if (!isErr(statusResult)) {
						card = { ...card, status: "deferred" };
						operations.status_changed = "not_now";
					}
				}

				if (statusResult && isErr(statusResult)) {
					failures.push({
						operation: `status:${args.status}`,
						error: statusResult.error.message,
					});
				}
			}

			// Pre-check avoids toggling tags that are already in desired state
			if (args.add_tags && args.add_tags.length > 0) {
				const tagsAdded: string[] = [];
				const currentTagTitles = card.tags.map((t) => t.title);

				for (const tagTitle of args.add_tags) {
					if (currentTagTitles.includes(tagTitle)) {
						continue;
					}
					const tagResult = await client.toggleTag(slug, cardNumber, tagTitle);
					if (isErr(tagResult)) {
						failures.push({
							operation: `add_tag:${tagTitle}`,
							error: tagResult.error.message,
						});
					} else {
						tagsAdded.push(tagTitle);
					}
				}
				if (tagsAdded.length > 0) {
					operations.tags_added = tagsAdded;
				}
			}

			if (args.remove_tags && args.remove_tags.length > 0) {
				const tagsRemoved: string[] = [];
				const currentTagTitles = card.tags.map((t) => t.title);

				for (const tagTitle of args.remove_tags) {
					if (!currentTagTitles.includes(tagTitle)) {
						continue;
					}
					const tagResult = await client.toggleTag(slug, cardNumber, tagTitle);
					if (isErr(tagResult)) {
						failures.push({
							operation: `remove_tag:${tagTitle}`,
							error: tagResult.error.message,
						});
					} else {
						tagsRemoved.push(tagTitle);
					}
				}
				if (tagsRemoved.length > 0) {
					operations.tags_removed = tagsRemoved;
				}
			}

			if (args.column_id && args.column_id !== card.column_id) {
				// Column-to-column moves require removing from current column first
				let unTriageFailed = false;
				if (card.column_id) {
					const unTriageResult = await client.unTriageCard(slug, cardNumber);
					if (isErr(unTriageResult)) {
						failures.push({
							operation: "untriage",
							error: unTriageResult.error.message,
						});
						unTriageFailed = true;
					}
				}

				// Skip triage if untriage failed to avoid double failures
				if (!unTriageFailed) {
					const triageResult = await client.triageCard(
						slug,
						cardNumber,
						args.column_id,
						args.position,
					);
					if (isErr(triageResult)) {
						failures.push({
							operation: `triage:${args.column_id}`,
							error: triageResult.error.message,
						});
					} else {
						card = { ...card, column_id: args.column_id };
						operations.triaged_to = args.column_id;
					}
				}
			}
		}

		const result: TaskResult = {
			mode: isCreateMode ? "create" : "update",
			card: {
				id: card.id,
				number: card.number,
				title: card.title,
				url: card.url,
				status: card.status,
			},
			operations,
			failures,
		};

		return JSON.stringify(result, null, 2);
	},
};
