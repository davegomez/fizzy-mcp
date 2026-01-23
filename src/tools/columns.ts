import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import type { Column } from "../schemas/columns.js";
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

function formatColumnList(columns: Column[]): string {
	if (columns.length === 0) {
		return "No columns found.";
	}
	return columns
		.map((c) => `${c.name} (${c.color}) - ${c.cards_count} cards`)
		.join("\n");
}

export const listColumnsTool = {
	name: "fizzy_list_columns",
	description: "List all columns on a board. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		board_id: z.string().describe("Board ID to list columns for."),
	}),
	execute: async (args: { account_slug?: string; board_id: string }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listColumns(slug, args.board_id);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return formatColumnList(result.value);
	},
};

export const getColumnTool = {
	name: "fizzy_get_column",
	description:
		"Get details for a specific column. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		board_id: z.string().describe("Board ID the column belongs to."),
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
			throw toUserError(result.error);
		}
		return JSON.stringify(result.value, null, 2);
	},
};

export const createColumnTool = {
	name: "fizzy_create_column",
	description: "Create a new column on a board. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		board_id: z.string().describe("Board ID to create the column on."),
		name: z.string().describe("Name of the new column."),
		color: z
			.string()
			.optional()
			.describe("Hex color for the column (e.g., '#FF5733')."),
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
			throw toUserError(result.error);
		}
		return JSON.stringify(result.value, null, 2);
	},
};

export const updateColumnTool = {
	name: "fizzy_update_column",
	description: "Update a column's name or color. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		board_id: z.string().describe("Board ID the column belongs to."),
		column_id: z.string().describe("Column ID to update."),
		name: z.string().optional().describe("New name for the column."),
		color: z.string().optional().describe("New hex color for the column."),
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
			throw toUserError(result.error);
		}
		return JSON.stringify(result.value, null, 2);
	},
};

export const deleteColumnTool = {
	name: "fizzy_delete_column",
	description: "Delete a column from a board. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		board_id: z.string().describe("Board ID the column belongs to."),
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
			throw toUserError(result.error);
		}
		return `Column ${args.column_id} deleted successfully.`;
	},
};
