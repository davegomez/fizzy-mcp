import { HttpResponse, http } from "msw";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { resetClient } from "../client/fizzy.js";
import { ENV_TOKEN } from "../config.js";
import { clearResolverCache } from "../state/account-resolver.js";
import { clearSession, setSession } from "../state/session.js";
import { server } from "../test/mocks/server.js";
import { getCardTool, searchTool } from "./cards.js";

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
	title: "Fix authentication bug",
	description_html: "<p>Users are getting logged out unexpectedly</p>",
	status: "open",
	board_id: "board_1",
	column_id: "col_1",
	tags: [{ id: "tag_1", title: "bug", color: "red" }],
	assignees: [
		{ id: "user_1", name: "Alice", email_address: "alice@example.com" },
	],
	steps_count: 3,
	completed_steps_count: 1,
	comments_count: 5,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-15T00:00:00Z",
	closed_at: null,
	url: "https://app.fizzy.do/897362094/cards/42",
};

describe("searchTool", () => {
	beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
	afterEach(() => {
		server.resetHandlers();
		clearSession();
		clearResolverCache();
		resetClient();
	});
	afterAll(() => server.close());

	beforeEach(() => {
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should resolve account from args", async () => {
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards`, ({ params }) => {
				expect(params.accountSlug).toBe("my-account");
				return HttpResponse.json([mockCard]);
			}),
		);

		const result = await searchTool.execute({
			account_slug: "my-account",
			limit: 25,
		});
		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(1);
	});

	test("should resolve account from default when not provided", async () => {
		setTestAccount("default-account");
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards`, ({ params }) => {
				expect(params.accountSlug).toBe("default-account");
				return HttpResponse.json([]);
			}),
		);

		const result = await searchTool.execute({ limit: 25 });
		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(0);
	});

	test("should throw when no account and no default set", async () => {
		// Override identity to return empty accounts to prevent auto-detection
		server.use(
			http.get(`${BASE_URL}/my/identity`, () => {
				return HttpResponse.json({ accounts: [] });
			}),
		);
		await expect(searchTool.execute({})).rejects.toThrow(
			/No account specified/,
		);
	});

	test("should strip leading slash from account slug", async () => {
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards`, ({ params }) => {
				expect(params.accountSlug).toBe("897362094");
				return HttpResponse.json([]);
			}),
		);

		await searchTool.execute({ account_slug: "/897362094", limit: 25 });
	});

	test("should pass filters to client", async () => {
		setTestAccount("897362094");
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards`, ({ request }) => {
				const url = new URL(request.url);
				expect(url.searchParams.get("board_id")).toBe("board_1");
				expect(url.searchParams.get("column_id")).toBe("col_1");
				expect(url.searchParams.getAll("tag_ids[]")).toEqual([
					"tag_1",
					"tag_2",
				]);
				expect(url.searchParams.getAll("assignee_ids[]")).toEqual(["user_1"]);
				expect(url.searchParams.get("status")).toBe("open");
				return HttpResponse.json([]);
			}),
		);

		await searchTool.execute({
			board_id: "board_1",
			column_id: "col_1",
			tag_ids: ["tag_1", "tag_2"],
			assignee_ids: ["user_1"],
			status: "open",
			limit: 25,
		});
	});

	test("should return JSON with items and pagination", async () => {
		setTestAccount("897362094");
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards`, () => {
				return HttpResponse.json([mockCard], {
					headers: {
						Link: `<${BASE_URL}/897362094/cards?page=2>; rel="next"`,
					},
				});
			}),
		);

		const result = await searchTool.execute({ limit: 25 });
		const parsed = JSON.parse(result);

		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].number).toBe(42);
		expect(parsed.pagination.returned).toBe(1);
		expect(parsed.pagination.has_more).toBe(true);
	});

	test("should return empty items array when no cards found", async () => {
		setTestAccount("897362094");
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards`, () => {
				return HttpResponse.json([]);
			}),
		);

		const result = await searchTool.execute({ limit: 25 });
		const parsed = JSON.parse(result);

		expect(parsed.items).toHaveLength(0);
		expect(parsed.pagination.has_more).toBe(false);
	});

	test("should throw UserError on API error", async () => {
		setTestAccount("897362094");
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards`, () => {
				return HttpResponse.json({}, { status: 401 });
			}),
		);

		await expect(searchTool.execute({ limit: 25 })).rejects.toThrow(
			"Authentication failed",
		);
	});
});

describe("getCardTool", () => {
	beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
	afterEach(() => {
		server.resetHandlers();
		clearSession();
		clearResolverCache();
		resetClient();
	});
	afterAll(() => server.close());

	beforeEach(() => {
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should fetch card by number", async () => {
		server.use(
			http.get(
				`${BASE_URL}/:accountSlug/cards/:cardIdentifier`,
				({ params }) => {
					expect(params.accountSlug).toBe("my-account");
					expect(params.cardIdentifier).toBe("42");
					return HttpResponse.json(mockCard);
				},
			),
		);

		await getCardTool.execute({ account_slug: "my-account", card_number: 42 });
	});

	test("should fetch card by ID when card_id provided", async () => {
		server.use(
			http.get(
				`${BASE_URL}/:accountSlug/cards/:cardIdentifier`,
				({ params }) => {
					expect(params.accountSlug).toBe("my-account");
					expect(params.cardIdentifier).toBe("03fgjbkhgph377d3fbph6z2qj");
					return HttpResponse.json(mockCard);
				},
			),
		);

		await getCardTool.execute({
			account_slug: "my-account",
			card_id: "03fgjbkhgph377d3fbph6z2qj",
		});
	});

	test("should prefer card_number over card_id when both provided", async () => {
		server.use(
			http.get(
				`${BASE_URL}/:accountSlug/cards/:cardIdentifier`,
				({ params }) => {
					expect(params.cardIdentifier).toBe("42");
					return HttpResponse.json(mockCard);
				},
			),
		);

		await getCardTool.execute({
			account_slug: "my-account",
			card_number: 42,
			card_id: "03fgjbkhgph377d3fbph6z2qj",
		});
	});

	test("should throw when neither card_number nor card_id provided", async () => {
		setTestAccount("my-account");
		await expect(getCardTool.execute({})).rejects.toThrow(
			"Either card_number or card_id must be provided",
		);
	});

	test("should throw when no account and no default set", async () => {
		// Override identity to return empty accounts to prevent auto-detection
		server.use(
			http.get(`${BASE_URL}/my/identity`, () => {
				return HttpResponse.json({ accounts: [] });
			}),
		);
		await expect(getCardTool.execute({ card_number: 42 })).rejects.toThrow(
			/No account specified/,
		);
	});

	test("should return JSON with markdown description", async () => {
		setTestAccount("897362094");
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardIdentifier`, () => {
				return HttpResponse.json(mockCard);
			}),
		);

		const result = await getCardTool.execute({ card_number: 42 });

		const parsed = JSON.parse(result);
		expect(parsed.number).toBe(42);
		expect(parsed.title).toBe("Fix authentication bug");
		expect(parsed.description).toBe(
			"Users are getting logged out unexpectedly",
		);
		expect(parsed.status).toBe("open");
		expect(parsed.tags).toHaveLength(1);
		expect(parsed.tags[0].title).toBe("bug");
		expect(parsed.assignees).toHaveLength(1);
	});

	test("should handle null description", async () => {
		setTestAccount("897362094");
		const cardNoDesc = { ...mockCard, description_html: null };
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardIdentifier`, () => {
				return HttpResponse.json(cardNoDesc);
			}),
		);

		const result = await getCardTool.execute({ card_number: 42 });

		const parsed = JSON.parse(result);
		expect(parsed.description).toBeNull();
	});

	test("should throw UserError on not found by number", async () => {
		setTestAccount("897362094");
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardIdentifier`, () => {
				return HttpResponse.json({}, { status: 404 });
			}),
		);

		await expect(getCardTool.execute({ card_number: 999 })).rejects.toThrow(
			"[NOT_FOUND] Card #999",
		);
	});

	test("should throw UserError on not found by ID", async () => {
		setTestAccount("897362094");
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardIdentifier`, () => {
				return HttpResponse.json({}, { status: 404 });
			}),
		);

		await expect(
			getCardTool.execute({ card_id: "nonexistent_id" }),
		).rejects.toThrow("[NOT_FOUND] Card nonexistent_id");
	});

	describe("schema validation", () => {
		test("should use strict schema that rejects unknown keys", () => {
			const result = getCardTool.parameters.safeParse({
				card_number: 42,
				unknown_param: "should fail",
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].code).toBe("unrecognized_keys");
			}
		});

		test("should accept card_number alone", () => {
			const result = getCardTool.parameters.safeParse({ card_number: 42 });
			expect(result.success).toBe(true);
		});

		test("should accept card_id alone", () => {
			const result = getCardTool.parameters.safeParse({
				card_id: "03fgjbkhgph377d3fbph6z2qj",
			});
			expect(result.success).toBe(true);
		});

		test("should accept both card_number and card_id", () => {
			const result = getCardTool.parameters.safeParse({
				card_number: 42,
				card_id: "03fgjbkhgph377d3fbph6z2qj",
			});
			expect(result.success).toBe(true);
		});
	});
});
