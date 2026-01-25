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
});
