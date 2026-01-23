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

**Related:** Use account slug with \`fizzy_set_default_account\` to avoid passing it on every call.`,
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
	description: `Set the default account for subsequent API calls.

Eliminates need to pass \`account_slug\` on every tool call.

**When to use:**
- After \`fizzy_whoami\` to set working account for the session
- Switching between accounts mid-session

**Don't use when:** You need to operate on multiple accounts simultaneously — pass \`account_slug\` explicitly instead.

**Arguments:**
- \`account_slug\` (required): Account slug from \`fizzy_whoami\` (e.g., "897362094")

**Returns:** Confirmation message: "Default account set to: {slug}"

**Related:** Use \`fizzy_get_default_account\` to check current setting.`,
	parameters: z.object({
		account_slug: z
			.string()
			.describe(
				"Account slug to set as default (e.g., '897362094'). Get available slugs from fizzy_whoami.",
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
	description: `Get the current default account slug.

Check which account will be used when \`account_slug\` is omitted from tool calls.

**When to use:**
- Verify default before bulk operations
- Debug unexpected account context

**Arguments:** None required.

**Returns:** Current default slug or message that none is set.
- If set: "Default account: {slug}"
- If not set: "No default account set. Use fizzy_set_default_account to set one."`,
	parameters: z.object({}),
	execute: async () => {
		const account = getDefaultAccount();
		if (account) {
			return `Default account: ${account}`;
		}
		return "No default account set. Use fizzy_set_default_account to set one.";
	},
};
