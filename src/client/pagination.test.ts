import { describe, expect, test, vi } from "vitest";
import {
	collectAll,
	decodeCursor,
	encodeCursor,
	paginatedFetch,
} from "./pagination.js";

describe("paginatedFetch", () => {
	test("should yield all items from single page", async () => {
		const fetchFn = vi.fn().mockResolvedValueOnce({
			data: [1, 2, 3],
			linkHeader: undefined,
		});

		const items: number[] = [];
		for await (const item of paginatedFetch("/items", fetchFn)) {
			items.push(item);
		}

		expect(items).toEqual([1, 2, 3]);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	test("should follow Link header for multiple pages", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce({
				data: [1, 2],
				linkHeader: '</items?page=2>; rel="next"',
			})
			.mockResolvedValueOnce({
				data: [3, 4],
				linkHeader: undefined,
			});

		const items = await collectAll(paginatedFetch("/items", fetchFn));

		expect(items).toEqual([1, 2, 3, 4]);
		expect(fetchFn).toHaveBeenCalledTimes(2);
		expect(fetchFn).toHaveBeenNthCalledWith(2, "/items?page=2");
	});

	test("should stop when no next link", async () => {
		const fetchFn = vi.fn().mockResolvedValueOnce({
			data: [1],
			linkHeader: '</items?page=1>; rel="prev"',
		});

		const items = await collectAll(paginatedFetch("/items", fetchFn));

		expect(items).toEqual([1]);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});
});

describe("collectAll", () => {
	test("should collect all items from async generator", async () => {
		async function* gen() {
			yield 1;
			yield 2;
			yield 3;
		}
		const items = await collectAll(gen());
		expect(items).toEqual([1, 2, 3]);
	});
});

describe("encodeCursor", () => {
	test("should encode URL to base64url string", () => {
		const url = "https://app.fizzy.do/123/boards?page=2";
		const cursor = encodeCursor(url);

		expect(typeof cursor).toBe("string");
		expect(cursor.length).toBeGreaterThan(0);
		// base64url should not contain +, /, or =
		expect(cursor).not.toMatch(/[+/=]/);
	});

	test("should produce different cursors for different URLs", () => {
		const url1 = "https://app.fizzy.do/123/boards?page=2";
		const url2 = "https://app.fizzy.do/123/boards?page=3";

		const cursor1 = encodeCursor(url1);
		const cursor2 = encodeCursor(url2);

		expect(cursor1).not.toBe(cursor2);
	});
});

describe("decodeCursor", () => {
	test("should decode valid cursor back to original URL", () => {
		const url = "https://app.fizzy.do/123/boards?page=2";
		const cursor = encodeCursor(url);

		const decoded = decodeCursor(cursor);

		expect(decoded).toBe(url);
	});

	test("should return null for invalid base64", () => {
		const invalidCursor = "not-valid-base64!!!";

		const decoded = decodeCursor(invalidCursor);

		expect(decoded).toBeNull();
	});

	test("should return null for valid base64 that is not a URL", () => {
		// "hello world" encoded in base64url
		const notAUrl = Buffer.from("hello world").toString("base64url");

		const decoded = decodeCursor(notAUrl);

		expect(decoded).toBeNull();
	});

	test("should handle empty string", () => {
		const decoded = decodeCursor("");

		expect(decoded).toBeNull();
	});
});

describe("cursor roundtrip", () => {
	test("should roundtrip correctly for various URLs", () => {
		const urls = [
			"https://app.fizzy.do/123/boards?page=2",
			"https://app.fizzy.do/456/cards?board_id=b1&status=open&page=5",
			"http://localhost:3000/test?foo=bar",
		];

		for (const url of urls) {
			const cursor = encodeCursor(url);
			const decoded = decodeCursor(cursor);
			expect(decoded).toBe(url);
		}
	});
});
