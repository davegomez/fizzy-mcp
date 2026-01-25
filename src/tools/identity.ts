import { UserError } from "fastmcp";
import { z } from "zod";
import { getDefaultAccount, setDefaultAccount } from "../state/session.js";

const accountActions = ["get", "set"] as const;

export const defaultAccountTool = {
	name: "fizzy_account",
	description: `Get or set the default account for API calls.

Manages the session default so you don't need to pass \`account_slug\` on every tool call.

**When to use:**
- Set working account after discovering accounts via \`fizzy_boards\`
- Check current default before operations

**Don't use when:** Operating across multiple accounts simultaneously — pass \`account_slug\` explicitly instead.

**Arguments:**
- \`action\` (required): "get" to check current default, "set" to change it
- \`account_slug\` (required for set): Account slug (e.g., "897362094")

**Returns:** JSON with action and current/new account_slug.
\`\`\`json
{ "action": "set", "account_slug": "897362094" }
{ "action": "get", "account_slug": null }
\`\`\`

**Related:** \`fizzy_boards\` response includes account context.`,
	parameters: z.object({
		action: z
			.enum(accountActions)
			.describe(
				"Action: get | set. Use 'get' to check current, 'set' to change.",
			),
		account_slug: z
			.string()
			.optional()
			.describe("Account slug (required for set action)."),
	}),
	execute: async (args: { action: "get" | "set"; account_slug?: string }) => {
		if (args.action === "set") {
			if (!args.account_slug) {
				throw new UserError(
					"Action 'set' requires account_slug. Use fizzy_boards to discover available accounts.",
				);
			}
			// Strip leading slash to normalize URLs pasted directly from Fizzy
			const slug = args.account_slug.replace(/^\//, "");
			setDefaultAccount(slug);
			return JSON.stringify({ action: "set", account_slug: slug });
		}

		const current = getDefaultAccount();
		return JSON.stringify({ action: "get", account_slug: current ?? null });
	},
};
