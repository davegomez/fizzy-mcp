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
	description:
		"List all boards in the account with column breakdown. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
	}),
	execute: async (args: { account_slug?: string }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listBoards(slug);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return formatBoardList(result.value);
	},
};

export const getBoardTool = {
	name: "fizzy_get_board",
	description:
		"Get details of a specific board including columns. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		board_id: z.string().describe("Board ID to retrieve."),
	}),
	execute: async (args: { account_slug?: string; board_id: string }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.getBoard(slug, args.board_id);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return formatBoard(result.value);
	},
};

export const createBoardTool = {
	name: "fizzy_create_board",
	description:
		"Create a new board. Description can be markdown (converted to HTML automatically). Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		name: z.string().describe("Board name."),
		description: z
			.string()
			.optional()
			.describe("Board description (markdown supported)."),
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
			throw toUserError(result.error);
		}
		return formatBoard(result.value);
	},
};

export const updateBoardTool = {
	name: "fizzy_update_board",
	description:
		"Update an existing board. Description can be markdown (converted to HTML automatically). Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		board_id: z.string().describe("Board ID to update."),
		name: z.string().optional().describe("New board name."),
		description: z
			.string()
			.optional()
			.describe("New board description (markdown supported)."),
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
			throw toUserError(result.error);
		}
		return formatBoard(result.value);
	},
};
