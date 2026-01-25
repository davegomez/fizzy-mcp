/**
 * Environment variable names for configuration.
 * FIZZY_TOKEN is the primary name; FIZZY_ACCESS_TOKEN supported for backward compatibility.
 */
export const ENV_TOKEN = "FIZZY_TOKEN";
export const ENV_TOKEN_LEGACY = "FIZZY_ACCESS_TOKEN";
export const ENV_BASE_URL = "FIZZY_BASE_URL";

/**
 * Reads the API token from environment, preferring FIZZY_TOKEN over FIZZY_ACCESS_TOKEN.
 */
export function getToken(): string | undefined {
	return process.env[ENV_TOKEN] ?? process.env[ENV_TOKEN_LEGACY];
}
