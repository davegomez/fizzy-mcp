import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import type { Tag } from "../schemas/tags.js";
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

function formatTagList(tags: Tag[]): string {
	if (tags.length === 0) {
		return "No tags found.";
	}
	return tags.map((t) => `${t.title} (${t.color})`).join("\n");
}

export const listTagsTool = {
	name: "fizzy_list_tags",
	description:
		"List all tags in the account. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
	}),
	execute: async (args: { account_slug?: string }) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.listTags(slug);
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return formatTagList(result.value);
	},
};
