import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { htmlToMarkdown } from "../client/markdown.js";
import type {
	AssignmentStatus,
	Card,
	DateRange,
	IndexedBy,
	SortedBy,
} from "../schemas/cards.js";
import { DEFAULT_LIMIT } from "../schemas/pagination.js";
import { resolveAccount } from "../state/account-resolver.js";
import { isErr } from "../types/result.js";

function formatCard(card: Card): string {
	// Convert HTML to markdown for LLM-friendly output
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
			closed: card.closed,
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
			golden: card.golden ?? false,
			last_active_at: card.last_active_at ?? null,
			image_url: card.image_url ?? null,
			steps: card.steps ?? [],
		},
		null,
		2,
	);
}

export const searchTool = {
	name: "fizzy_search",
	description: `Search for cards with filters.
Find cards matching criteria or review board contents.

**When to use:**
- Find cards by tag, assignee, or board
- Filter by index category (closed, stalled, golden, etc.)

**Don't use when:** You already know the card number — use \`fizzy_get_card\` instead.

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`board_id\` (optional): Filter to cards on this board
- \`indexed_by\` (optional): Filter by index category: closed | not_now | all | stalled | postponing_soon | golden
- \`tag_ids\` (optional): Filter to cards with ALL these tag IDs
- \`assignee_ids\` (optional): Filter to cards assigned to ANY of these user IDs
- \`sorted_by\` (optional): Sort order: newest | oldest | recently_active
- \`terms\` (optional): Search terms to filter cards by text content
- \`limit\` (optional): Max items, 1-100 (default: 25)
- \`cursor\` (optional): Continuation cursor from previous response

**Returns:** JSON with items and pagination metadata.
\`\`\`json
{"items": [{"number": 42, "title": "...", ...}], "pagination": {"returned": 25, "has_more": true, "next_cursor": "..."}}
\`\`\`

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
		indexed_by: z
			.enum([
				"closed",
				"not_now",
				"all",
				"stalled",
				"postponing_soon",
				"golden",
			])
			.optional()
			.describe(
				"Filter by index category: closed | not_now | all | stalled | postponing_soon | golden.",
			),
		tag_ids: z
			.array(z.string())
			.optional()
			.describe("Filter to cards with ALL these tag IDs."),
		assignee_ids: z
			.array(z.string())
			.optional()
			.describe("Filter to cards assigned to ANY of these user IDs."),
		sorted_by: z
			.enum(["newest", "oldest", "recently_active"])
			.optional()
			.describe("Sort order: newest | oldest | recently_active."),
		terms: z
			.array(z.string())
			.optional()
			.describe("Search terms to filter cards by text content."),
		creator_ids: z
			.array(z.string())
			.optional()
			.describe("Filter to cards created by these user IDs."),
		closer_ids: z
			.array(z.string())
			.optional()
			.describe("Filter to cards closed by these user IDs."),
		card_ids: z
			.array(z.string())
			.optional()
			.describe("Filter to specific card IDs."),
		assignment_status: z
			.enum(["unassigned"])
			.optional()
			.describe("Filter by assignment status: unassigned."),
		creation: z
			.enum([
				"today",
				"yesterday",
				"thisweek",
				"thismonth",
				"last7",
				"last14",
				"last30",
			])
			.optional()
			.describe(
				"Filter by creation date range: today | yesterday | thisweek | thismonth | last7 | last14 | last30.",
			),
		closure: z
			.enum([
				"today",
				"yesterday",
				"thisweek",
				"thismonth",
				"last7",
				"last14",
				"last30",
			])
			.optional()
			.describe(
				"Filter by closure date range: today | yesterday | thisweek | thismonth | last7 | last14 | last30.",
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
		board_id?: string;
		indexed_by?: IndexedBy;
		tag_ids?: string[];
		assignee_ids?: string[];
		creator_ids?: string[];
		closer_ids?: string[];
		card_ids?: string[];
		assignment_status?: AssignmentStatus;
		sorted_by?: SortedBy;
		terms?: string[];
		creation?: DateRange;
		closure?: DateRange;
		limit: number;
		cursor?: string;
	}) => {
		const slug = await resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listCards(
			slug,
			{
				board_ids: args.board_id ? [args.board_id] : undefined,
				indexed_by: args.indexed_by,
				tag_ids: args.tag_ids,
				assignee_ids: args.assignee_ids,
				creator_ids: args.creator_ids,
				closer_ids: args.closer_ids,
				card_ids: args.card_ids,
				assignment_status: args.assignment_status,
				sorted_by: args.sorted_by,
				terms: args.terms,
				creation: args.creation,
				closure: args.closure,
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
	description: `Get full details of a card by its number or ID.
Retrieve complete card data including description, steps count, and metadata.

**When to use:**
- Need full description or metadata for a specific card
- Check step completion status or see all tags/assignees

**Don't use when:** Scanning multiple cards - use \`fizzy_search\` first.

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`card_number\` (recommended): The human-readable \`#\` number from URLs/lists (e.g., 42)
- \`card_id\` (alternative): The UUID from API responses. Use \`card_number\` when possible.

**IMPORTANT:** Provide \`card_number\` (integer) OR \`card_id\` (string UUID), not both.
The \`card_number\` is the \`#\` visible in the UI (e.g., #42). The \`card_id\` is the internal UUID.

**Returns:**
JSON with id, number, title, description (markdown), status, board_id, column_id, tags array, assignees array, steps_count, completed_steps_count, comments_count, url, created_at, updated_at, closed_at (null if open).
Example: \`{"id": "card_abc", "number": 42, "title": "Fix bug", "status": "open", "steps_count": 3, ...}\`

**Related:** Use \`fizzy_comment\` or \`fizzy_step\` for deeper interaction.`,
	parameters: z
		.object({
			account_slug: z
				.string()
				.optional()
				.describe(
					"Account slug (e.g., 'acme-corp'). Uses session default if omitted.",
				),
			card_number: z
				.number()
				.optional()
				.describe(
					"Card number - the human-readable # from URLs/UI (e.g., 42). Preferred over card_id.",
				),
			card_id: z
				.string()
				.optional()
				.describe(
					"Card UUID from API responses. Use card_number instead when you have the # visible in the UI.",
				),
		})
		.strict(),
	execute: async (args: {
		account_slug?: string;
		card_number?: number;
		card_id?: string;
	}) => {
		const slug = await resolveAccount(args.account_slug);
		const client = getFizzyClient();

		// Prefer card_number over card_id
		if (args.card_number !== undefined) {
			const result = await client.getCard(slug, args.card_number);
			if (isErr(result)) {
				throw toUserError(result.error, {
					resourceType: "Card",
					resourceId: `#${args.card_number}`,
					container: `account "${slug}"`,
				});
			}
			return formatCard(result.value);
		}

		if (args.card_id !== undefined) {
			const result = await client.getCardById(slug, args.card_id);
			if (isErr(result)) {
				throw toUserError(result.error, {
					resourceType: "Card",
					resourceId: args.card_id,
					container: `account "${slug}"`,
				});
			}
			return formatCard(result.value);
		}

		throw new UserError(
			"Either card_number or card_id must be provided. Use card_number (the # from URLs) when possible.",
		);
	},
};
