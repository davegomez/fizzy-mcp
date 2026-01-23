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
	description:
		"List cards with optional filters. Uses default account if set.",
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
