import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { getDefaultAccount, setDefaultAccount } from "../state/session.js";
import { isErr } from "../types/result.js";

export const whoamiTool = {
	name: "fizzy_whoami",
	description: `Get current user identity and available accounts.

Returns authenticated user info and account slugs needed for API calls.

**When to use:**
- Session start to discover account slugs before other operations
- Verify which user is currently authenticated

**Arguments:** None required.

**Returns:** JSON with user info and accounts array.
\`\`\`json
{ "user": { "id": "123", "name": "Dave" }, "accounts": [{ "slug": "897362094", "name": "My Team" }] }
\`\`\`
Key fields: \`user.id\`, \`user.name\`, \`accounts[].slug\`, \`accounts[].name\`.

**Related:** Use account slug with \`fizzy_default_account\` to avoid passing it on every call.`,
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

const accountActions = ["get", "set"] as const;

export const defaultAccountTool = {
	name: "fizzy_default_account",
	description: `Get or set the default account for API calls.

Manages the session default so you don't need to pass \`account_slug\` on every tool call.

**When to use:**
- Check current default before bulk operations
- Set working account after \`fizzy_whoami\` discovery

**Don't use when:** Operating across multiple accounts simultaneously — pass \`account_slug\` explicitly instead.

**Arguments:**
- \`action\` (required): "get" to check current default, "set" to change it
- \`account_slug\` (required for set): Account slug from \`fizzy_whoami\` (e.g., "897362094")

**Returns:** JSON with action and current/new account_slug.
\`\`\`json
{ "action": "get", "account_slug": "897362094" }
{ "action": "set", "account_slug": "897362094" }
{ "action": "get", "account_slug": null }
\`\`\`

**Related:** \`fizzy_whoami\` to discover available account slugs.`,
	parameters: z.object({
		action: z
			.enum(accountActions)
			.describe('Action to perform: "get" to check current, "set" to change'),
		account_slug: z
			.string()
			.optional()
			.describe(
				"Account slug (required for set action). Get available slugs from fizzy_whoami.",
			),
	}),
	execute: async (args: { action: "get" | "set"; account_slug?: string }) => {
		if (args.action === "set") {
			if (!args.account_slug) {
				throw new UserError(
					"Action 'set' requires account_slug. Use fizzy_whoami to find available accounts.",
				);
			}
			const slug = args.account_slug.replace(/^\//, "");
			setDefaultAccount(slug);
			return JSON.stringify({ action: "set", account_slug: slug });
		}

		const current = getDefaultAccount();
		return JSON.stringify({ action: "get", account_slug: current ?? null });
	},
};
