import { UserError } from "fastmcp";
import { getFizzyClient } from "../client/fizzy.js";
import { getAccountFromEnv, normalizeSlug } from "../config.js";
import { isErr } from "../types/result.js";
import { getDefaultAccount, setSession } from "./session.js";

const NO_ACCOUNT_ERROR =
	"No account specified. Set FIZZY_ACCOUNT env var, use fizzy_account tool, or pass account_slug.";

// Cache state: undefined = not tried, null = tried but failed/multiple, string = success
let cachedAutoDetect: string | null | undefined;

export function clearResolverCache(): void {
	cachedAutoDetect = undefined;
}

export async function resolveAccount(accountSlug?: string): Promise<string> {
	// 1. Tool parameter
	if (accountSlug) {
		return normalizeSlug(accountSlug);
	}

	// 2. Session state
	const fromSession = getDefaultAccount();
	if (fromSession) return fromSession;

	// 3. Environment variable
	const fromEnv = getAccountFromEnv();
	if (fromEnv) return fromEnv;

	// 4. Auto-detect single account
	const auto = await autoDetectAccount();
	if (auto) return auto;

	throw new UserError(NO_ACCOUNT_ERROR);
}

async function autoDetectAccount(): Promise<string | undefined> {
	// Return cached result if we've already tried
	if (cachedAutoDetect !== undefined) {
		return cachedAutoDetect ?? undefined;
	}

	const client = getFizzyClient();
	const result = await client.whoami();

	if (isErr(result)) {
		cachedAutoDetect = null;
		throw new UserError(NO_ACCOUNT_ERROR);
	}

	const { accounts } = result.value;

	if (accounts.length === 0) {
		cachedAutoDetect = null;
		throw new UserError(NO_ACCOUNT_ERROR);
	}

	if (accounts.length !== 1) {
		cachedAutoDetect = null;
		return undefined;
	}

	// Single account - auto-select and populate session
	const [account] = accounts;
	if (!account) {
		cachedAutoDetect = null;
		return undefined;
	}
	const slug = normalizeSlug(account.slug);
	setSession({
		account: {
			slug,
			name: account.name,
			id: account.id,
		},
		user: {
			id: account.user.id,
			name: account.user.name,
			role: account.user.role,
		},
		source: "auto-detect",
	});

	cachedAutoDetect = slug;
	return slug;
}
