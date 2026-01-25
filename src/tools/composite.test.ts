import { beforeEach, describe, expect, test, vi } from "vitest";
import { NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { bulkCloseCardsTool } from "./composite.js";

const mockCard = {
	id: "card_1",
	number: 42,
	title: "Test Card",
	description_html: null,
	status: "open" as const,
	board_id: "board_1",
	column_id: "col_1",
	tags: [{ id: "tag_1", title: "Bug", color: "red" }],
	assignees: [],
	steps_count: 0,
	completed_steps_count: 0,
	comments_count: 0,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-15T00:00:00Z",
	closed_at: null,
	url: "https://app.fizzy.do/test/cards/42",
};

const mockCard2 = {
	...mockCard,
	id: "card_2",
	number: 43,
	title: "Test Card 2",
	updated_at: "2024-01-01T00:00:00Z", // Older
};

const mockTags = [
	{ id: "tag_1", title: "Bug", color: "red", description: null },
	{ id: "tag_2", title: "Feature", color: "blue", description: null },
];

describe("bulkCloseCardsTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should throw when force is false", async () => {
		setDefaultAccount("test-account");
		await expect(
			bulkCloseCardsTool.execute({ card_numbers: [1, 2, 3], force: false }),
		).rejects.toThrow("Bulk close requires force: true");
	});

	test("should throw when no card_numbers and no filters", async () => {
		setDefaultAccount("test-account");
		await expect(bulkCloseCardsTool.execute({ force: true })).rejects.toThrow(
			"Must provide card_numbers or at least one filter",
		);
	});

	test("should close explicit card numbers", async () => {
		const closeCardFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockCard, status: "closed" as const }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			card_numbers: [42, 43, 44],
			force: true,
		});

		const parsed = JSON.parse(result);
		expect(parsed.closed).toEqual([42, 43, 44]);
		expect(parsed.failed).toEqual([]);
		expect(parsed.total).toBe(3);
		expect(parsed.success_count).toBe(3);
		expect(closeCardFn).toHaveBeenCalledTimes(3);
	});

	test("should report partial failures for explicit card numbers", async () => {
		const closeCardFn = vi
			.fn()
			.mockResolvedValueOnce(ok({ ...mockCard, status: "closed" as const }))
			.mockResolvedValueOnce(err(new NotFoundError()))
			.mockResolvedValueOnce(ok({ ...mockCard, status: "closed" as const }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			card_numbers: [42, 43, 44],
			force: true,
		});

		const parsed = JSON.parse(result);
		expect(parsed.closed).toEqual([42, 44]);
		expect(parsed.failed).toHaveLength(1);
		expect(parsed.failed[0].card_number).toBe(43);
		expect(parsed.failed[0].error).toBe("Resource not found.");
		expect(parsed.total).toBe(3);
		expect(parsed.success_count).toBe(2);
	});

	test("should filter by column_id", async () => {
		const listCardsFn = vi.fn().mockResolvedValue(
			ok({
				items: [mockCard, mockCard2],
				pagination: { returned: 2, has_more: false },
			}),
		);
		const closeCardFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockCard, status: "closed" as const }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			column_id: "col_1",
			force: true,
		});

		expect(listCardsFn).toHaveBeenCalledWith("test-account", {
			status: "open",
			column_id: "col_1",
		});
		const parsed = JSON.parse(result);
		expect(parsed.closed).toEqual([42, 43]);
		expect(parsed.success_count).toBe(2);
	});

	test("should filter by tag_title", async () => {
		const listTagsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: mockTags, pagination: { returned: 2, has_more: false } }),
			);
		const listCardsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [mockCard], pagination: { returned: 1, has_more: false } }),
			);
		const closeCardFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockCard, status: "closed" as const }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: listTagsFn,
			listCards: listCardsFn,
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			tag_title: "Bug",
			force: true,
		});

		expect(listTagsFn).toHaveBeenCalledWith("test-account");
		expect(listCardsFn).toHaveBeenCalledWith("test-account", {
			status: "open",
			tag_ids: ["tag_1"],
		});
		const parsed = JSON.parse(result);
		expect(parsed.closed).toEqual([42]);
	});

	test("should throw when tag not found", async () => {
		const listTagsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: mockTags, pagination: { returned: 2, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: listTagsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		await expect(
			bulkCloseCardsTool.execute({
				tag_title: "NonExistent",
				force: true,
			}),
		).rejects.toThrow('Tag "NonExistent" not found');
	});

	test("should filter by older_than_days", async () => {
		const now = new Date();
		const oldDate = new Date(now);
		oldDate.setDate(oldDate.getDate() - 40);
		const recentDate = new Date(now);
		recentDate.setDate(recentDate.getDate() - 5);

		const oldCard = { ...mockCard, updated_at: oldDate.toISOString() };
		const recentCard = {
			...mockCard2,
			updated_at: recentDate.toISOString(),
		};

		const listCardsFn = vi.fn().mockResolvedValue(
			ok({
				items: [oldCard, recentCard],
				pagination: { returned: 2, has_more: false },
			}),
		);
		const closeCardFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockCard, status: "closed" as const }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			older_than_days: 30,
			force: true,
		});

		const parsed = JSON.parse(result);
		// Only oldCard should be closed (40 days > 30 days threshold)
		expect(parsed.closed).toEqual([42]);
		expect(parsed.total).toBe(1);
	});

	test("should combine multiple filters with AND logic", async () => {
		const now = new Date();
		const oldDate = new Date(now);
		oldDate.setDate(oldDate.getDate() - 40);

		const cardMatchingAll = {
			...mockCard,
			column_id: "col_1",
			updated_at: oldDate.toISOString(),
			tags: [{ id: "tag_1", title: "Bug", color: "red" }],
		};
		const cardMismatchAge = {
			...mockCard2,
			column_id: "col_1",
			updated_at: now.toISOString(), // Too recent
			tags: [{ id: "tag_1", title: "Bug", color: "red" }],
		};

		const listTagsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: mockTags, pagination: { returned: 2, has_more: false } }),
			);
		const listCardsFn = vi.fn().mockResolvedValue(
			ok({
				items: [cardMatchingAll, cardMismatchAge],
				pagination: { returned: 2, has_more: false },
			}),
		);
		const closeCardFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockCard, status: "closed" as const }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: listTagsFn,
			listCards: listCardsFn,
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			column_id: "col_1",
			tag_title: "Bug",
			older_than_days: 30,
			force: true,
		});

		expect(listCardsFn).toHaveBeenCalledWith("test-account", {
			status: "open",
			column_id: "col_1",
			tag_ids: ["tag_1"],
		});
		const parsed = JSON.parse(result);
		// Only cardMatchingAll should be closed (matches age filter)
		expect(parsed.closed).toEqual([42]);
		expect(parsed.total).toBe(1);
	});

	test("should return empty result when no cards match filters", async () => {
		const listCardsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			column_id: "col_nonexistent",
			force: true,
		});

		const parsed = JSON.parse(result);
		expect(parsed.closed).toEqual([]);
		expect(parsed.failed).toEqual([]);
		expect(parsed.total).toBe(0);
		expect(parsed.success_count).toBe(0);
	});

	test("should resolve account from args", async () => {
		const closeCardFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockCard, status: "closed" as const }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		await bulkCloseCardsTool.execute({
			account_slug: "my-account",
			card_numbers: [42],
			force: true,
		});

		expect(closeCardFn).toHaveBeenCalledWith("my-account", 42);
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			bulkCloseCardsTool.execute({ card_numbers: [42], force: true }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should match tag title case-insensitively", async () => {
		const listTagsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: mockTags, pagination: { returned: 2, has_more: false } }),
			);
		const listCardsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [mockCard], pagination: { returned: 1, has_more: false } }),
			);
		const closeCardFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockCard, status: "closed" as const }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: listTagsFn,
			listCards: listCardsFn,
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		await bulkCloseCardsTool.execute({
			tag_title: "bug", // lowercase
			force: true,
		});

		expect(listCardsFn).toHaveBeenCalledWith("test-account", {
			status: "open",
			tag_ids: ["tag_1"],
		}); // Should find "Bug" tag
	});
});
