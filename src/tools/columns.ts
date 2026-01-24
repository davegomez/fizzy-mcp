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

export const listColumnsTool = {
	name: "fizzy_list_columns",
	description: `List columns on a board.
Get column IDs, names, and card counts for a specific board.

**When to use:**
1. Need column IDs for triaging cards with \`fizzy_triage_card\`
2. See how cards are distributed across workflow stages

**Don't use when:** You need column details from all boards — use \`fizzy_list_boards\` which includes column summaries.

**Arguments:**
- \`account_slug\` (optional) — defaults to session account
- \`board_id\` (required) — the board containing the columns
- \`limit\` (optional): Max items to return, 1-100 (default: 25)
- \`cursor\` (optional): Continuation cursor from previous response

**Returns:** JSON with items and pagination metadata.
\`\`\`json
{"items": [{"id": "...", "name": "To Do", "color": "blue", "cards_count": 5}], "pagination": {"returned": 3, "has_more": false}}
\`\`\`
Pass \`next_cursor\` to get the next page.

**Related:** Use column ID with \`fizzy_triage_card\` to move cards between columns.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Defaults to session account if not provided."),
		board_id: z.string().describe("Board ID containing the columns to list."),
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
		board_id: string;
		limit: number;
		cursor?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listColumns(slug, args.board_id, {
			limit: args.limit,
			cursor: args.cursor,
		});
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Column",
				container: `board "${args.board_id}"`,
			});
		}
		return JSON.stringify(result.value, null, 2);
	},
};

export const getColumnTool = {
	name: "fizzy_get_column",
	description: `Get details for a specific column.
Retrieve full column metadata including position and settings.

**When to use:**
1. Verify column exists before bulk operations
2. Get exact column configuration (position, color, card count)

**Don't use when:** You just need column IDs — use \`fizzy_list_columns\` for the overview.

**Arguments:**
- \`account_slug\` (optional) — defaults to session account
- \`board_id\` (required) — the board containing the column
- \`column_id\` (required) — the column to retrieve

**Returns:** JSON with column details.
Example: {"id": "col_abc", "name": "To Do", "color": "blue", "position": 0, "cards_count": 5, "board_id": "brd_xyz"}`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Defaults to session account if not provided."),
		board_id: z.string().describe("Board ID containing this column."),
		column_id: z.string().describe("Column ID to retrieve."),
	}),
	execute: async (args: {
		account_slug?: string;
		board_id: string;
		column_id: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.getColumn(slug, args.board_id, args.column_id);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Column",
				resourceId: args.column_id,
				container: `board "${args.board_id}"`,
			});
		}
		return JSON.stringify(result.value, null, 2);
	},
};

export const createColumnTool = {
	name: "fizzy_create_column",
	description: `Create a new column on a board.
Add a workflow stage to organize cards.

**When to use:**
1. Setting up board structure for a new project
2. Adding a new workflow stage (e.g., "Code Review", "QA")

**Arguments:**
- \`account_slug\` (optional) — defaults to session account
- \`board_id\` (required) — the board to add the column to
- \`name\` (required) — column name (1-255 chars)
- \`color\` (optional) — hex color like '#FF5733' or named color

**Returns:** JSON with new column details including id.
Example: {"id": "col_new", "name": "Code Review", "color": "purple", "position": 3, "cards_count": 0}

**Related:** Column is added at the end. Use \`fizzy_triage_card\` to move cards into it.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Defaults to session account if not provided."),
		board_id: z.string().describe("Board ID to create the column on."),
		name: z.string().describe("Name for the new column (1-255 chars)."),
		color: z
			.string()
			.optional()
			.describe("Hex color (e.g., '#FF5733') or named color (e.g., 'blue')."),
	}),
	execute: async (args: {
		account_slug?: string;
		board_id: string;
		name: string;
		color?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.createColumn(slug, args.board_id, {
			name: args.name,
			color: args.color,
		});
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Column",
				container: `board "${args.board_id}"`,
			});
		}
		return JSON.stringify(result.value, null, 2);
	},
};

export const updateColumnTool = {
	name: "fizzy_update_column",
	description: `Update a column's name or color.
Rename a workflow stage or change its visual styling.

**When to use:**
1. Rename column to reflect changed workflow
2. Update column color for better visibility or categorization

**Arguments:**
- \`account_slug\` (optional) — defaults to session account
- \`board_id\` (required) — the board containing the column
- \`column_id\` (required) — the column to update
- \`name\` (optional) — new column name
- \`color\` (optional) — new hex color or named color

**Returns:** JSON with updated column details.
Example: {"id": "col_abc", "name": "Ready for Review", "color": "orange", "position": 2, "cards_count": 3}`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Defaults to session account if not provided."),
		board_id: z.string().describe("Board ID containing this column."),
		column_id: z.string().describe("Column ID to update."),
		name: z.string().optional().describe("New name for the column."),
		color: z.string().optional().describe("New hex color or named color."),
	}),
	execute: async (args: {
		account_slug?: string;
		board_id: string;
		column_id: string;
		name?: string;
		color?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.updateColumn(
			slug,
			args.board_id,
			args.column_id,
			{
				name: args.name,
				color: args.color,
			},
		);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Column",
				resourceId: args.column_id,
				container: `board "${args.board_id}"`,
			});
		}
		return JSON.stringify(result.value, null, 2);
	},
};

export const deleteColumnTool = {
	name: "fizzy_delete_column",
	description: `Delete a column from a board.
Remove an unused workflow stage.

**When to use:**
1. Consolidating workflow stages
2. Removing test or obsolete columns

**Don't use when:** Column has cards — move or close them first.

**Arguments:**
- \`account_slug\` (optional) — defaults to session account
- \`board_id\` (required) — the board containing the column
- \`column_id\` (required) — the column to delete

**Returns:** Confirmation message.
Example: "Column col_abc deleted successfully."

**Related:** Cards in the column will be moved to inbox. Consider moving them first with \`fizzy_triage_card\`.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Defaults to session account if not provided."),
		board_id: z.string().describe("Board ID containing this column."),
		column_id: z.string().describe("Column ID to delete."),
	}),
	execute: async (args: {
		account_slug?: string;
		board_id: string;
		column_id: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.deleteColumn(
			slug,
			args.board_id,
			args.column_id,
		);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Column",
				resourceId: args.column_id,
				container: `board "${args.board_id}"`,
			});
		}
		return `Column ${args.column_id} deleted successfully.`;
	},
};
