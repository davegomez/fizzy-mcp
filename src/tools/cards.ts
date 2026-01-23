import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { htmlToMarkdown } from "../client/markdown.js";
import type { Card, CardStatus } from "../schemas/cards.js";
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

function truncateDescription(html: string | null, maxLen = 100): string {
	if (!html) return "";
	const md = htmlToMarkdown(html);
	return md.length > maxLen ? `${md.slice(0, maxLen)}...` : md;
}

function formatCardList(cards: Card[]): string {
	if (cards.length === 0) {
		return "No cards found.";
	}
	return cards
		.map((c) => {
			const tags = c.tags.map((t) => t.title).join(", ");
			const desc = truncateDescription(c.description_html);
			return `#${c.number}: ${c.title}\n  Status: ${c.status}${tags ? `\n  Tags: ${tags}` : ""}${desc ? `\n  ${desc}` : ""}`;
		})
		.join("\n\n");
}

function formatCard(card: Card): string {
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
		},
		null,
		2,
	);
}

export const listCardsTool = {
	name: "fizzy_list_cards",
	description: "List cards with optional filters. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		board_id: z.string().optional().describe("Filter by board ID."),
		column_id: z.string().optional().describe("Filter by column ID."),
		tag_ids: z.array(z.string()).optional().describe("Filter by tag IDs."),
		assignee_ids: z
			.array(z.string())
			.optional()
			.describe("Filter by assignee IDs."),
		status: z
			.enum(["open", "closed", "deferred"])
			.optional()
			.describe("Filter by status."),
	}),
	execute: async (args: {
		account_slug?: string;
		board_id?: string;
		column_id?: string;
		tag_ids?: string[];
		assignee_ids?: string[];
		status?: CardStatus;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listCards(slug, {
			board_id: args.board_id,
			column_id: args.column_id,
			tag_ids: args.tag_ids,
			assignee_ids: args.assignee_ids,
			status: args.status,
		});
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return formatCardList(result.value);
	},
};

export const getCardTool = {
	name: "fizzy_get_card",
	description:
		"Get full details of a card by number. Description returned as markdown. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to retrieve."),
	}),
	execute: async (args: { account_slug?: string; card_number: number }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.getCard(slug, args.card_number);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return formatCard(result.value);
	},
};

export const createCardTool = {
	name: "fizzy_create_card",
	description:
		"Create a new card on a board. Description can be markdown (auto-converted to HTML). Card goes to inbox by default. Uses default account if set.",
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
	}),
	execute: async (args: {
		account_slug?: string;
		board_id: string;
		title: string;
		description?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.createCard(slug, args.board_id, {
			title: args.title,
			description: args.description,
		});
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		const card = result.value;
		return JSON.stringify(
			{
				id: card.id,
				number: card.number,
				title: card.title,
				url: card.url,
			},
			null,
			2,
		);
	},
};

export const updateCardTool = {
	name: "fizzy_update_card",
	description:
		"Update a card's title and/or description. Description can be markdown (auto-converted to HTML). Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to update."),
		title: z.string().optional().describe("New title."),
		description: z
			.string()
			.optional()
			.describe("New description (markdown supported)."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		title?: string;
		description?: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.updateCard(slug, args.card_number, {
			title: args.title,
			description: args.description,
		});
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return formatCard(result.value);
	},
};

export const deleteCardTool = {
	name: "fizzy_delete_card",
	description: "Delete a card by number. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to delete."),
	}),
	execute: async (args: { account_slug?: string; card_number: number }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.deleteCard(slug, args.card_number);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return `Card #${args.card_number} deleted.`;
	},
};

export const toggleTagTool = {
	name: "fizzy_toggle_tag",
	description:
		"Add or remove a tag from a card. If the tag is present, removes it. If absent, adds it. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to toggle tag on."),
		tag_title: z.string().describe("Tag title to add or remove."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		tag_title: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.toggleTag(
			slug,
			args.card_number,
			args.tag_title,
		);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return `Toggled tag "${args.tag_title}" on card #${args.card_number}.`;
	},
};

export const toggleAssigneeTool = {
	name: "fizzy_toggle_assignee",
	description:
		"Assign or unassign a user to a card. If assigned, removes assignment. If not assigned, adds it. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to toggle assignee on."),
		user_id: z.string().describe("User ID to assign or unassign."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		user_id: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.toggleAssignee(
			slug,
			args.card_number,
			args.user_id,
		);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return `Toggled assignee "${args.user_id}" on card #${args.card_number}.`;
	},
};

export const closeCardTool = {
	name: "fizzy_close_card",
	description: "Mark a card as done/closed. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to close."),
	}),
	execute: async (args: { account_slug?: string; card_number: number }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.closeCard(slug, args.card_number);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return `Card #${args.card_number} closed. Status: ${result.value.status}`;
	},
};

export const reopenCardTool = {
	name: "fizzy_reopen_card",
	description: "Reopen a closed card. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to reopen."),
	}),
	execute: async (args: { account_slug?: string; card_number: number }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.reopenCard(slug, args.card_number);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return `Card #${args.card_number} reopened. Status: ${result.value.status}`;
	},
};

export const triageCardTool = {
	name: "fizzy_triage_card",
	description:
		"Move a card from inbox to a column. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to triage."),
		column_id: z.string().describe("Target column ID."),
		position: z
			.enum(["top", "bottom"])
			.optional()
			.describe("Position in column (top or bottom)."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		column_id: string;
		position?: "top" | "bottom";
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.triageCard(
			slug,
			args.card_number,
			args.column_id,
			args.position,
		);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return `Card #${args.card_number} triaged to column ${args.column_id}.`;
	},
};

export const unTriageCardTool = {
	name: "fizzy_untriage_card",
	description: "Move a card back to the inbox. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to untriage."),
	}),
	execute: async (args: { account_slug?: string; card_number: number }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.unTriageCard(slug, args.card_number);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return `Card #${args.card_number} moved back to inbox.`;
	},
};

export const notNowCardTool = {
	name: "fizzy_not_now_card",
	description: "Defer a card (mark as not now). Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to defer."),
	}),
	execute: async (args: { account_slug?: string; card_number: number }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.notNowCard(slug, args.card_number);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return `Card #${args.card_number} deferred. Status: ${result.value.status}`;
	},
};
