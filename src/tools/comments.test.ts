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
import { ENV_TOKEN } from "../config.js";
import { clearResolverCache } from "../state/account-resolver.js";
import { clearSession, setSession } from "../state/session.js";
import { server } from "../test/mocks/server.js";
import { commentTool } from "./comments.js";

const BASE_URL = "https://app.fizzy.do";

function setTestAccount(slug: string): void {
	setSession({
		account: { slug, name: "Test Account", id: "acc_test" },
		user: { id: "user_test", name: "Test User", role: "member" },
	});
}

const mockComment = {
	id: "comment_1",
	created_at: "2024-01-15T10:30:00Z",
	updated_at: "2024-01-15T10:30:00Z",
	body: {
		plain_text: "This looks good to me!",
		html: "<p>This looks good to me!</p>",
	},
	creator: {
		id: "user_1",
		name: "Alice",
		email_address: "alice@example.com",
		role: "owner",
		active: true,
	},
	card: {
		id: "card_1",
		url: "https://app.fizzy.do/897362094/cards/42",
	},
	reactions_url:
		"https://app.fizzy.do/897362094/cards/42/comments/comment_1/reactions",
	url: "https://app.fizzy.do/897362094/cards/42/comments/comment_1",
};

const mockComment2 = {
	...mockComment,
	id: "comment_2",
	body: {
		plain_text: "I agree with Alice",
		html: "<p>I agree with Alice</p>",
	},
	creator: { ...mockComment.creator, id: "user_2", name: "Bob" },
	url: "https://app.fizzy.do/897362094/cards/42/comments/comment_2",
};

describe("commentTool", () => {
	beforeAll(() => {
		server.listen({ onUnhandledRequest: "error" });
	});

	afterAll(() => {
		server.close();
	});

	beforeEach(() => {
		clearSession();
		clearResolverCache();
		process.env[ENV_TOKEN] = "test-token";
	});

	afterEach(() => {
		server.resetHandlers();
	});

	// === CREATE (default action) ===

	test("should resolve account from args", async () => {
		let capturedAccountSlug: string | undefined;
		let capturedCardNumber: string | undefined;

		server.use(
			http.post(
				`${BASE_URL}/:accountSlug/cards/:cardNumber/comments`,
				({ params }) => {
					capturedAccountSlug = params.accountSlug as string;
					capturedCardNumber = params.cardNumber as string;
					return HttpResponse.json(mockComment, { status: 201 });
				},
			),
		);

		await commentTool.execute({
			account_slug: "my-account",
			card_number: 42,
			body: "New comment",
		});

		expect(capturedAccountSlug).toBe("my-account");
		expect(capturedCardNumber).toBe("42");
	});

	test("should resolve account from default when not provided", async () => {
		setTestAccount("default-account");

		let capturedAccountSlug: string | undefined;

		server.use(
			http.post(
				`${BASE_URL}/:accountSlug/cards/:cardNumber/comments`,
				({ params }) => {
					capturedAccountSlug = params.accountSlug as string;
					return HttpResponse.json(mockComment, { status: 201 });
				},
			),
		);

		await commentTool.execute({
			card_number: 42,
			body: "New comment",
		});

		expect(capturedAccountSlug).toBe("default-account");
	});

	test("should throw when no account and no default set", async () => {
		server.use(
			http.get(`${BASE_URL}/my/identity`, () => {
				return HttpResponse.json({}, { status: 401 });
			}),
		);

		await expect(
			commentTool.execute({ card_number: 42, body: "Test" }),
		).rejects.toThrow(/No account specified/);
	});

	test("should strip leading slash from account slug", async () => {
		let capturedAccountSlug: string | undefined;

		server.use(
			http.post(
				`${BASE_URL}/:accountSlug/cards/:cardNumber/comments`,
				({ params }) => {
					capturedAccountSlug = params.accountSlug as string;
					return HttpResponse.json(mockComment, { status: 201 });
				},
			),
		);

		await commentTool.execute({
			account_slug: "/897362094",
			card_number: 42,
			body: "New comment",
		});

		expect(capturedAccountSlug).toBe("897362094");
	});

	test("should return created comment as JSON", async () => {
		setTestAccount("897362094");

		server.use(
			http.post(`${BASE_URL}/897362094/cards/42/comments`, () => {
				return HttpResponse.json(mockComment, { status: 201 });
			}),
		);

		const result = await commentTool.execute({
			card_number: 42,
			body: "New comment",
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("comment_1");
		expect(parsed.body).toBe("This looks good to me!");
		expect(parsed.creator.name).toBe("Alice");
	});

	test("should throw UserError on not found", async () => {
		setTestAccount("897362094");

		server.use(
			http.post(`${BASE_URL}/897362094/cards/999/comments`, () => {
				return HttpResponse.json({}, { status: 404 });
			}),
		);

		await expect(
			commentTool.execute({ card_number: 999, body: "Test" }),
		).rejects.toThrow("[NOT_FOUND] Comment");
	});

	test("create action works explicitly", async () => {
		setTestAccount("897362094");

		server.use(
			http.post(`${BASE_URL}/897362094/cards/42/comments`, () => {
				return HttpResponse.json(mockComment, { status: 201 });
			}),
		);

		const result = await commentTool.execute({
			action: "create",
			card_number: 42,
			body: "New comment",
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("comment_1");
	});

	// === LIST ===

	test("list returns formatted comments", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/cards/42/comments`, () => {
				return HttpResponse.json([mockComment, mockComment2]);
			}),
		);

		const result = await commentTool.execute({
			action: "list",
			card_number: 42,
		});

		const parsed = JSON.parse(result);
		expect(parsed.comments).toHaveLength(2);
		expect(parsed.comments[0].id).toBe("comment_2");
		expect(parsed.comments[1].id).toBe("comment_1");
	});

	test("list on card with no comments returns empty", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/cards/42/comments`, () => {
				return HttpResponse.json([]);
			}),
		);

		const result = await commentTool.execute({
			action: "list",
			card_number: 42,
		});

		const parsed = JSON.parse(result);
		expect(parsed.comments).toHaveLength(0);
		expect(parsed.pagination.has_more).toBe(false);
	});

	test("list propagates pagination info", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/cards/42/comments`, () => {
				return HttpResponse.json([mockComment], {
					headers: {
						Link: `<${BASE_URL}/897362094/cards/42/comments?page=2>; rel="next"`,
					},
				});
			}),
		);

		const result = await commentTool.execute({
			action: "list",
			card_number: 42,
		});

		const parsed = JSON.parse(result);
		expect(parsed.pagination.has_more).toBe(true);
		expect(parsed.pagination.next_cursor).toBeDefined();
	});

	// === UPDATE ===

	test("update with comment_id and body returns updated comment", async () => {
		setTestAccount("897362094");

		const updatedComment = {
			...mockComment,
			body: {
				plain_text: "Updated text",
				html: "<p>Updated text</p>",
			},
			updated_at: "2024-01-16T10:30:00Z",
		};

		server.use(
			http.put(`${BASE_URL}/897362094/cards/42/comments/comment_1`, () => {
				return HttpResponse.json(updatedComment);
			}),
		);

		const result = await commentTool.execute({
			action: "update",
			card_number: 42,
			comment_id: "comment_1",
			body: "Updated text",
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("comment_1");
		expect(parsed.body).toBe("Updated text");
	});

	test("update without comment_id throws", async () => {
		setTestAccount("897362094");

		await expect(
			commentTool.execute({
				action: "update",
				card_number: 42,
				body: "Updated text",
			}),
		).rejects.toThrow(/comment_id/);
	});

	test("update without body throws", async () => {
		setTestAccount("897362094");

		await expect(
			commentTool.execute({
				action: "update",
				card_number: 42,
				comment_id: "comment_1",
			}),
		).rejects.toThrow(/body/);
	});

	test("update nonexistent comment returns error", async () => {
		setTestAccount("897362094");

		server.use(
			http.put(`${BASE_URL}/897362094/cards/42/comments/nonexistent`, () => {
				return HttpResponse.json({}, { status: 404 });
			}),
		);

		await expect(
			commentTool.execute({
				action: "update",
				card_number: 42,
				comment_id: "nonexistent",
				body: "Updated text",
			}),
		).rejects.toThrow("[NOT_FOUND] Comment");
	});

	// === DELETE ===

	test("delete with comment_id returns confirmation", async () => {
		setTestAccount("897362094");

		server.use(
			http.delete(`${BASE_URL}/897362094/cards/42/comments/comment_1`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const result = await commentTool.execute({
			action: "delete",
			card_number: 42,
			comment_id: "comment_1",
		});

		const parsed = JSON.parse(result);
		expect(parsed.deleted).toBe(true);
		expect(parsed.comment_id).toBe("comment_1");
	});

	test("delete without comment_id throws", async () => {
		setTestAccount("897362094");

		await expect(
			commentTool.execute({
				action: "delete",
				card_number: 42,
			}),
		).rejects.toThrow(/comment_id/);
	});

	test("delete nonexistent comment returns error", async () => {
		setTestAccount("897362094");

		server.use(
			http.delete(`${BASE_URL}/897362094/cards/42/comments/nonexistent`, () => {
				return HttpResponse.json({}, { status: 404 });
			}),
		);

		await expect(
			commentTool.execute({
				action: "delete",
				card_number: 42,
				comment_id: "nonexistent",
			}),
		).rejects.toThrow("[NOT_FOUND] Comment");
	});
});
