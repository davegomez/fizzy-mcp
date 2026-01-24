import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { htmlToMarkdown } from "../client/markdown.js";
import type { Board } from "../schemas/boards.js";
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

function formatBoardList(boards: Board[]): string {
	if (boards.length === 0) {
		return "No boards found.";
	}
	return boards
		.map((b) => {
			const cols = b.columns
				.map((c) => `  ${c.name}: ${c.cards_count} cards`)
				.join("\n");
			return `${b.name}\n${cols || "  (no columns)"}`;
		})
		.join("\n\n");
}

function formatBoard(board: Board): string {
	const description = board.description
		? htmlToMarkdown(board.description)
		: null;
	return JSON.stringify(
		{
			id: board.id,
			name: board.name,
			slug: board.slug,
			description,
			columns: board.columns,
			url: board.url,
			created_at: board.created_at,
			updated_at: board.updated_at,
		},
		null,
		2,
	);
}

export const listBoardsTool = {
	name: "fizzy_list_boards",
	description: `List all boards in the account with column summaries.

Get an overview of boards and their column structure including card counts.

**When to use:**
- Discover board IDs for subsequent operations
- See card counts per column across all boards

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted

**Returns:** Formatted text listing each board with columns and card counts.
\`\`\`
Project Alpha
  Backlog: 12 cards
  In Progress: 3 cards
  Done: 8 cards
\`\`\`

**Related:** Use board ID with \`fizzy_get_board\` for full details or \`fizzy_list_cards\` to see cards.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe(
				"Account slug (e.g., '897362094'). Uses session default if omitted.",
			),
	}),
	execute: async (args: { account_slug?: string }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listBoards(slug);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Board",
				container: `account "${slug}"`,
			});
		}
		return formatBoardList(result.value);
	},
};

export const getBoardTool = {
	name: "fizzy_get_board",
	description: `Get full details of a specific board including all columns.

Retrieve complete board data for planning or reference.

**When to use:**
- Need column IDs for triaging cards between columns
- Get board description or metadata

**Don't use when:** You only need board name or existence — use \`fizzy_list_boards\` instead.

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`board_id\` (required): Board ID to retrieve

**Returns:** JSON with board details.
\`\`\`json
{ "id": "123", "name": "Project Alpha", "slug": "project-alpha", "description": "Main project board", "columns": [{ "id": "456", "name": "Backlog" }], "url": "https://...", "created_at": "...", "updated_at": "..." }
\`\`\`
Key fields: \`id\`, \`name\`, \`columns[].id\`, \`columns[].name\`, \`description\` (markdown, null if not set).

**Related:** Use column IDs with \`fizzy_triage_card\` or \`fizzy_list_cards\`.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe(
				"Account slug (e.g., '897362094'). Uses session default if omitted.",
			),
		board_id: z.string().describe("Board ID to retrieve."),
	}),
	execute: async (args: { account_slug?: string; board_id: string }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.getBoard(slug, args.board_id);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Board",
				resourceId: args.board_id,
				container: `account "${slug}"`,
			});
		}
		return formatBoard(result.value);
	},
};

export const createBoardTool = {
	name: "fizzy_create_board",
	description: `Create a new board in the account.

Set up a new board for organizing cards into columns.

**When to use:**
- Starting a new project that needs its own workspace
- Need separate board to organize different work streams

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`name\` (required): Board name (1-100 characters)
- \`description\` (optional): Board description, markdown supported

**Returns:** JSON with new board details.
\`\`\`json
{ "id": "789", "name": "New Project", "slug": "new-project", "description": null, "columns": [], "url": "https://...", "created_at": "...", "updated_at": "..." }
\`\`\`
Key fields: \`id\`, \`name\`, \`slug\`, \`url\`.

**Related:** Add columns with \`fizzy_create_column\`, then create cards with \`fizzy_create_card\`.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe(
				"Account slug (e.g., '897362094'). Uses session default if omitted.",
			),
		name: z.string().describe("Board name (1-100 characters)."),
		description: z
			.string()
			.optional()
			.describe("Board description (markdown supported, converted to HTML)."),
	}),
	execute: async (args: {
		account_slug?: string;
		name: string;
		description?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.createBoard(slug, {
			name: args.name,
			description: args.description,
		});
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Board",
				container: `account "${slug}"`,
			});
		}
		return formatBoard(result.value);
	},
};

export const updateBoardTool = {
	name: "fizzy_update_board",
	description: `Update a board's name or description.

Modify board metadata without affecting cards or columns.

**When to use:**
- Rename a board to reflect changed scope
- Update board description with new guidelines

**Don't use when:** You want to modify columns — use \`fizzy_create_column\`, \`fizzy_update_column\`, or \`fizzy_delete_column\` instead.

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`board_id\` (required): Board ID to update
- \`name\` (optional): New board name (1-100 characters)
- \`description\` (optional): New description, markdown supported

**Returns:** JSON with updated board details (same structure as \`fizzy_get_board\`).
Key fields: \`id\`, \`name\`, \`slug\`, \`description\` (markdown), \`url\`.

**Related:** Use \`fizzy_get_board\` to retrieve current values before updating.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe(
				"Account slug (e.g., '897362094'). Uses session default if omitted.",
			),
		board_id: z.string().describe("Board ID to update."),
		name: z.string().optional().describe("New board name (1-100 characters)."),
		description: z
			.string()
			.optional()
			.describe(
				"New board description (markdown supported, converted to HTML).",
			),
	}),
	execute: async (args: {
		account_slug?: string;
		board_id: string;
		name?: string;
		description?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.updateBoard(slug, args.board_id, {
			name: args.name,
			description: args.description,
		});
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Board",
				resourceId: args.board_id,
				container: `account "${slug}"`,
			});
		}
		return formatBoard(result.value);
	},
};
