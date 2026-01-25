// Module-level state persists across tool invocations within a single MCP session.
// This lets users set a default account once rather than passing it to every call.
let defaultAccountSlug: string | undefined;

export function getDefaultAccount(): string | undefined {
	return defaultAccountSlug;
}

export function setDefaultAccount(slug: string): void {
	defaultAccountSlug = slug;
}

export function clearDefaultAccount(): void {
	defaultAccountSlug = undefined;
}
