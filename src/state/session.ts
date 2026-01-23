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
