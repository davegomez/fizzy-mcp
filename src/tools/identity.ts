import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { getDefaultAccount, setDefaultAccount } from "../state/session.js";
import { isErr } from "../types/result.js";

export const whoamiTool = {
	name: "fizzy_whoami",
	description:
		"List accounts and current user info for the authenticated identity. Use this to discover available account slugs before setting a default.",
	parameters: z.object({}),
	execute: async () => {
		const client = getFizzyClient();
		const result = await client.whoami();
		if (isErr(result)) {
			throw toUserError(result.error);
		}
		return JSON.stringify(result.value, null, 2);
	},
};

export const setDefaultAccountTool = {
	name: "fizzy_set_default_account",
	description:
		"Set the default account slug for subsequent API calls. Get available slugs from fizzy_whoami first.",
	parameters: z.object({
		account_slug: z
			.string()
			.describe(
				"Account slug (e.g., '897362094'). Get this from fizzy_whoami.",
			),
	}),
	execute: async (args: { account_slug: string }) => {
		const slug = args.account_slug.replace(/^\//, "");
		setDefaultAccount(slug);
		return `Default account set to: ${slug}`;
	},
};

export const getDefaultAccountTool = {
	name: "fizzy_get_default_account",
	description: "Get the current default account slug, if set.",
	parameters: z.object({}),
	execute: async () => {
		const account = getDefaultAccount();
		if (account) {
			return `Default account: ${account}`;
		}
		return "No default account set. Use fizzy_set_default_account to set one.";
	},
};
