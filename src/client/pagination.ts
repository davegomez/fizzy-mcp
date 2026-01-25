import parseLinkHeader from "parse-link-header";

// Cursors are opaque to clients but encode full URLs internally,
// preserving filter state across pagination boundaries
export function encodeCursor(url: string): string {
	return Buffer.from(url).toString("base64url");
}

export function decodeCursor(cursor: string): string | null {
	try {
		const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
		// Validate URL structure to reject malformed or tampered cursors
		if (!decoded.startsWith("http")) {
			return null;
		}
		return decoded;
	} catch {
		return null;
	}
}

export async function* paginatedFetch<T>(
	initialUrl: string,
	fetchFn: (url: string) => Promise<{ data: T[]; linkHeader?: string }>,
): AsyncGenerator<T, void, undefined> {
	let nextUrl: string | undefined = initialUrl;

	while (nextUrl) {
		const { data, linkHeader } = await fetchFn(nextUrl);

		for (const item of data) {
			yield item;
		}

		if (linkHeader) {
			const links = parseLinkHeader(linkHeader);
			nextUrl = links?.next?.url;
		} else {
			nextUrl = undefined;
		}
	}
}

export async function collectAll<T>(
	generator: AsyncGenerator<T, void, undefined>,
): Promise<T[]> {
	const items: T[] = [];
	for await (const item of generator) {
		items.push(item);
	}
	return items;
}
