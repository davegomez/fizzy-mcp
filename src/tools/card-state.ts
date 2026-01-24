import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { htmlToMarkdown } from "../client/markdown.js";
import type { Card } from "../schemas/cards.js";
import { getDefaultAccount } from "../state/session.js";
import { isErr } from "../types/result.js";

function levenshteinDistance(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
		Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
	);
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const row = dp[i];
			const prevRow = dp[i - 1];
			if (row && prevRow) {
				row[j] =
					a[i - 1] === b[j - 1]
						? (prevRow[j - 1] ?? 0)
						: 1 +
							Math.min(
								prevRow[j] ?? 0,
								row[j - 1] ?? 0,
								prevRow[j - 1] ?? 0,
							);
			}
		}
	}
	return dp[m]?.[n] ?? 0;
}

function findClosest(input: string, candidates: readonly string[]): string {
	return candidates.reduce((best, c) =>
		levenshteinDistance(input.toLowerCase(), c) <
		levenshteinDistance(input.toLowerCase(), best)
			? c
			: best,
	);
}

function resolveAccount(accountSlug?: string): string {
	const slug = (accountSlug || getDefaultAccount())?.replace(/^\//, "");
	if (!slug) {
		throw new UserError(
			"No account specified and no default set. Use fizzy_set_default_account first.",
		);
	}
	return slug;
}

function formatCard(card: Card): Record<string, unknown> {
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

const stateActions = [
	"close",
	"reopen",
	"archive",
	"activate",
	"triage",
	"untriage",
	"defer",
] as const;

type StateAction = (typeof stateActions)[number];

export const changeCardStateTool = {
	name: "fizzy_change_card_state",
	description: `Change a card's lifecycle state.
Transition cards through workflow states: open, closed, deferred, or move between columns.

**When to use:**
- Close completed work or archive for history
- Reopen or activate cards that need more work
- Move cards between columns (triage) or back to inbox (untriage)
- Defer cards that aren't current priority

**Don't use when:**
- Updating title/description - use \`fizzy_update_card\`
- Adding/removing tags - use \`fizzy_toggle_tag\`
- Assigning users - use \`fizzy_toggle_assignee\`

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`card_number\` (required): The \`#\` number from URLs/lists
- \`action\` (required): One of: close, reopen, archive, activate, triage, untriage, defer
  - \`close\`/\`archive\`: Mark card as done/closed
  - \`reopen\`/\`activate\`: Return card to open status
  - \`triage\`: Move card to a column (requires \`column_id\`)
  - \`untriage\`: Move card back to inbox
  - \`defer\`: Set aside card without closing (not now)
- \`column_id\` (required for triage): Target column ID
- \`position\` (optional for triage): \`top\` or \`bottom\` (default: bottom)

**Returns:**
JSON with \`action\` performed and full \`card\` details:
\`{"action": "close", "card": {"id": "...", "number": 42, "status": "closed", ...}}\`

**Related:**
- \`fizzy_list_columns\` to get column IDs for triage
- \`fizzy_get_card\` to check current state before changing`,
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
		action: z
			.enum(stateActions)
			.describe(
				"State action: close, reopen, archive, activate, triage, untriage, defer.",
			),
		column_id: z
			.string()
			.optional()
			.describe("Target column ID (required for triage action)."),
		position: z
			.enum(["top", "bottom"])
			.optional()
			.describe("Position in column for triage: top | bottom (default: bottom)."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		action: StateAction;
		column_id?: string;
		position?: "top" | "bottom";
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const { action, card_number, column_id, position } = args;

		// Validate triage requires column_id
		if (action === "triage" && !column_id) {
			throw new UserError(
				"triage action requires column_id. Use fizzy_list_columns to find column IDs for the board.",
			);
		}

		let result;
		switch (action) {
			case "close":
			case "archive":
				result = await client.closeCard(slug, card_number);
				break;
			case "reopen":
			case "activate":
				result = await client.reopenCard(slug, card_number);
				break;
			case "triage":
				result = await client.triageCard(slug, card_number, column_id!, position);
				break;
			case "untriage":
				result = await client.unTriageCard(slug, card_number);
				break;
			case "defer":
				result = await client.notNowCard(slug, card_number);
				break;
			default: {
				// TypeScript exhaustiveness check
				const _exhaustive: never = action;
				const suggestion = findClosest(action as string, stateActions);
				throw new UserError(
					`Unknown action "${action}". Did you mean "${suggestion}"?`,
				);
			}
		}

		if (isErr(result)) {
			throw toUserError(result.error);
		}

		return JSON.stringify(
			{
				action,
				card: formatCard(result.value),
			},
			null,
			2,
		);
	},
};
