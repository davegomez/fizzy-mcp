import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { resetClient } from "../client/fizzy.js";
import { ENV_TOKEN } from "../config.js";
import { clearResolverCache } from "../state/account-resolver.js";
import { clearSession, setSession } from "../state/session.js";
import { server } from "../test/mocks/server.js";
import { bulkCloseCardsTool } from "./composite.js";

const BASE_URL = "https://app.fizzy.do";

function setTestAccount(slug: string): void {
	setSession({
		account: { slug, name: "Test Account", id: "acc_test" },
		user: { id: "user_test", name: "Test User", role: "member" },
	});
}

const mockCard = {
	id: "card_1",
	number: 42,
	title: "Test Card",
	description_html: null,
	status: "published" as const,
	closed: false,
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
	updated_at: "2024-01-01T00:00:00Z",
};

const mockTags = [
	{
		id: "tag_1",
		title: "Bug",
		color: "red",
		created_at: "2024-01-01T00:00:00Z",
	},
	{
		id: "tag_2",
		title: "Feature",
		color: "blue",
		created_at: "2024-01-01T00:00:00Z",
	},
];

describe("bulkCloseCardsTool", () => {
	beforeEach(() => {
		clearSession();
		clearResolverCache();
		resetClient();
		process.env[ENV_TOKEN] = "test-token";
	});

	afterEach(() => {
		delete process.env[ENV_TOKEN];
	});

	test("should throw when force is false", async () => {
		setTestAccount("test-account");
		await expect(
			bulkCloseCardsTool.execute({ card_numbers: [1, 2, 3], force: false }),
		).rejects.toThrow("Bulk close requires force: true");
	});

	test("should throw when no card_numbers and no filters", async () => {
		setTestAccount("test-account");
		await expect(bulkCloseCardsTool.execute({ force: true })).rejects.toThrow(
			"Must provide card_numbers or at least one filter",
		);
	});

	test("should close explicit card numbers", async () => {
		const closedCards: number[] = [];
		server.use(
			http.post(
				`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`,
				({ params }) => {
					closedCards.push(Number(params.cardNumber));
					return new HttpResponse(null, { status: 204 });
				},
			),
		);

		setTestAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			card_numbers: [42, 43, 44],
			force: true,
		});

		const parsed = JSON.parse(result);
		expect(parsed.closed).toEqual([42, 43, 44]);
		expect(parsed.failed).toEqual([]);
		expect(parsed.total).toBe(3);
		expect(parsed.success_count).toBe(3);
		expect(closedCards).toEqual([42, 43, 44]);
	});

	test("should report partial failures for explicit card numbers", async () => {
		server.use(
			http.post(
				`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`,
				({ params }) => {
					const cardNumber = Number(params.cardNumber);
					if (cardNumber === 43) {
						return HttpResponse.json({}, { status: 404 });
					}
					return new HttpResponse(null, { status: 204 });
				},
			),
		);

		setTestAccount("test-account");
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
		// Card in col_1 (should be closed)
		const cardInCol1 = { ...mockCard, column_id: "col_1" };
		// Card in different column (should be excluded)
		const cardInCol2 = { ...mockCard2, column_id: "col_2" };

		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards`, () => {
				// API returns all cards, tool filters client-side by column_id
				return HttpResponse.json([cardInCol1, cardInCol2]);
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			column_id: "col_1",
			force: true,
		});

		const parsed = JSON.parse(result);
		// Only card in col_1 should be closed
		expect(parsed.closed).toEqual([42]);
		expect(parsed.success_count).toBe(1);
	});

	test("should filter by tag_title", async () => {
		let capturedCardFilters: URLSearchParams | undefined;
		server.use(
			http.get(`${BASE_URL}/:accountSlug/tags`, () => {
				return HttpResponse.json(mockTags);
			}),
			http.get(`${BASE_URL}/:accountSlug/cards`, ({ request }) => {
				capturedCardFilters = new URL(request.url).searchParams;
				return HttpResponse.json([mockCard]);
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			tag_title: "Bug",
			force: true,
		});

		expect(capturedCardFilters?.getAll("tag_ids[]")).toEqual(["tag_1"]);
		const parsed = JSON.parse(result);
		expect(parsed.closed).toEqual([42]);
	});

	test("should throw when tag not found", async () => {
		server.use(
			http.get(`${BASE_URL}/:accountSlug/tags`, () => {
				return HttpResponse.json(mockTags);
			}),
		);

		setTestAccount("test-account");
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
		const recentCard = { ...mockCard2, updated_at: recentDate.toISOString() };

		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards`, () => {
				return HttpResponse.json([oldCard, recentCard]);
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
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

		let capturedFilters: URLSearchParams | undefined;
		server.use(
			http.get(`${BASE_URL}/:accountSlug/tags`, () => {
				return HttpResponse.json(mockTags);
			}),
			http.get(`${BASE_URL}/:accountSlug/cards`, ({ request }) => {
				capturedFilters = new URL(request.url).searchParams;
				return HttpResponse.json([cardMatchingAll, cardMismatchAge]);
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await bulkCloseCardsTool.execute({
			column_id: "col_1",
			tag_title: "Bug",
			older_than_days: 30,
			force: true,
		});

		// tag_ids passed to API, column_id and age filtered client-side
		expect(capturedFilters?.getAll("tag_ids[]")).toEqual(["tag_1"]);
		const parsed = JSON.parse(result);
		// Only cardMatchingAll should be closed (matches age filter)
		expect(parsed.closed).toEqual([42]);
		expect(parsed.total).toBe(1);
	});

	test("should return empty result when no cards match filters", async () => {
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards`, () => {
				return HttpResponse.json([]);
			}),
		);

		setTestAccount("test-account");
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
		let capturedAccount: string | undefined;
		server.use(
			http.post(
				`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`,
				({ params }) => {
					capturedAccount = params.accountSlug as string;
					return new HttpResponse(null, { status: 204 });
				},
			),
		);

		await bulkCloseCardsTool.execute({
			account_slug: "my-account",
			card_numbers: [42],
			force: true,
		});

		expect(capturedAccount).toBe("my-account");
	});

	test("should throw when no account and no default set", async () => {
		// Override identity endpoint to return multiple accounts (cannot auto-select)
		server.use(
			http.get(`${BASE_URL}/my/identity`, () => {
				return HttpResponse.json({
					accounts: [
						{
							id: "acc_1",
							name: "Account 1",
							slug: "acc1",
							user: { id: "u1", name: "User", role: "member" },
						},
						{
							id: "acc_2",
							name: "Account 2",
							slug: "acc2",
							user: { id: "u2", name: "User", role: "member" },
						},
					],
				});
			}),
		);

		await expect(
			bulkCloseCardsTool.execute({ card_numbers: [42], force: true }),
		).rejects.toThrow(/No account specified/);
	});

	test("should match tag title case-insensitively", async () => {
		let capturedTagFilter: string[] | undefined;
		server.use(
			http.get(`${BASE_URL}/:accountSlug/tags`, () => {
				return HttpResponse.json(mockTags);
			}),
			http.get(`${BASE_URL}/:accountSlug/cards`, ({ request }) => {
				capturedTagFilter = new URL(request.url).searchParams.getAll(
					"tag_ids[]",
				);
				return HttpResponse.json([mockCard]);
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		await bulkCloseCardsTool.execute({
			tag_title: "bug", // lowercase
			force: true,
		});

		// Should find "Bug" tag (id: tag_1)
		expect(capturedTagFilter).toEqual(["tag_1"]);
	});
});
