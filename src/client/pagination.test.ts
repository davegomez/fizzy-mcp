import { describe, expect, test, vi } from "vitest";
import { collectAll, paginatedFetch } from "./pagination.js";

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
