export const ENV_TOKEN = "FIZZY_TOKEN";
export const ENV_BASE_URL = "FIZZY_BASE_URL";
export const ENV_ACCOUNT = "FIZZY_ACCOUNT";

export function getToken(): string | undefined {
	return process.env[ENV_TOKEN];
}

/**
 * Strips leading slash from account slug.
 * The API returns slugs with leading slash (e.g., "/897362094"), but URLs use them without.
 */
export function normalizeSlug(slug: string): string {
	return slug.replace(/^\//, "");
}

/**
 * Reads the default account slug from environment.
 * Strips leading slash to normalize URLs pasted directly from Fizzy.
 */
export function getAccountFromEnv(): string | undefined {
	const value = process.env[ENV_ACCOUNT];
	if (!value) return undefined;
	return normalizeSlug(value);
}
