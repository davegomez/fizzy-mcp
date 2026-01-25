import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient } from "../client/fizzy.js";
import { toUserError } from "../client/index.js";
import { normalizeSlug } from "../config.js";
import { getDefaultAccount, setSession } from "../state/session.js";
import { isErr } from "../types/result.js";

const accountActions = ["get", "set", "list"] as const;

export const defaultAccountTool = {
	name: "fizzy_account",
	description: `Get, set, or list accounts for API calls.

Manages the session default so you don't need to pass \`account_slug\` on every tool call.

**When to use:**
- List available accounts to see what you have access to
- Set working account after discovering accounts
- Check current default before operations

**Don't use when:** Operating across multiple accounts simultaneously — pass \`account_slug\` explicitly instead.

**Arguments:**
- \`action\` (required): "get" to check current default, "set" to change it, "list" to see available accounts
- \`account_slug\` (required for set): Account slug (e.g., "897362094")

**Returns:**
- get: \`{ "action": "get", "account_slug": "897362094" }\` or \`null\` if not set
- set: \`{ "action": "set", "account_slug": "897362094" }\`
- list: \`{ "action": "list", "accounts": [{ "slug": "...", "name": "...", "id": "..." }] }\`

**Related:** Most tools auto-resolve account via FIZZY_ACCOUNT env var or single-account auto-detection.`,
	parameters: z.object({
		action: z
			.enum(accountActions)
			.describe(
				"Action: get | set | list. Use 'get' to check current, 'set' to change, 'list' to see available.",
			),
		account_slug: z
			.string()
			.optional()
			.describe("Account slug (required for set action)."),
	}),
	execute: async (args: {
		action: "get" | "set" | "list";
		account_slug?: string;
	}) => {
		if (args.action === "list") {
			const client = getFizzyClient();
			const result = await client.whoami();
			if (isErr(result)) {
				throw toUserError(result.error, { resourceType: "Identity" });
			}
			const accounts = result.value.accounts.map((acc) => ({
				slug: normalizeSlug(acc.slug),
				name: acc.name,
				id: acc.id,
			}));
			return JSON.stringify({ action: "list", accounts });
		}

		if (args.action === "set") {
			if (!args.account_slug) {
				throw new UserError(
					"Action 'set' requires account_slug. Use fizzy_account tool with action 'list' to discover available accounts.",
				);
			}
			const slug = normalizeSlug(args.account_slug);

			// Fetch identity to populate full session context
			const client = getFizzyClient();
			const result = await client.whoami();
			if (isErr(result)) {
				throw toUserError(result.error, { resourceType: "Identity" });
			}

			const account = result.value.accounts.find(
				(acc) => normalizeSlug(acc.slug) === slug,
			);
			if (!account) {
				const available = result.value.accounts
					.map((acc) => normalizeSlug(acc.slug))
					.join(", ");
				throw new UserError(
					`Account "${slug}" not found. Available accounts: ${available || "(none)"}`,
				);
			}

			setSession({
				account: {
					slug: normalizeSlug(account.slug),
					name: account.name,
					id: account.id,
				},
				user: {
					id: account.user.id,
					name: account.user.name,
					role: account.user.role,
				},
				source: "explicit",
			});

			return JSON.stringify({ action: "set", account_slug: slug });
		}

		const current = getDefaultAccount();
		return JSON.stringify({ action: "get", account_slug: current ?? null });
	},
};
