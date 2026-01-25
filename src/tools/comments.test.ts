import { beforeEach, describe, expect, test, vi } from "vitest";
import { NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { commentTool } from "./comments.js";

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
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const createCommentFn = vi.fn().mockResolvedValue(ok(mockComment));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createComment: createCommentFn,
		} as unknown as client.FizzyClient);

		await commentTool.execute({
			account_slug: "my-account",
			card_number: 42,
			body: "New comment",
		});
		expect(createCommentFn).toHaveBeenCalledWith(
			"my-account",
			42,
			"New comment",
		);
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const createCommentFn = vi.fn().mockResolvedValue(ok(mockComment));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createComment: createCommentFn,
		} as unknown as client.FizzyClient);

		await commentTool.execute({
			card_number: 42,
			body: "New comment",
		});
		expect(createCommentFn).toHaveBeenCalledWith(
			"default-account",
			42,
			"New comment",
		);
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			commentTool.execute({ card_number: 42, body: "Test" }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should strip leading slash from account slug", async () => {
		const createCommentFn = vi.fn().mockResolvedValue(ok(mockComment));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createComment: createCommentFn,
		} as unknown as client.FizzyClient);

		await commentTool.execute({
			account_slug: "/897362094",
			card_number: 42,
			body: "New comment",
		});
		expect(createCommentFn).toHaveBeenCalledWith(
			"897362094",
			42,
			"New comment",
		);
	});

	test("should return created comment as JSON", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createComment: vi.fn().mockResolvedValue(ok(mockComment)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
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
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createComment: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			commentTool.execute({ card_number: 999, body: "Test" }),
		).rejects.toThrow("[NOT_FOUND] Comment");
	});
});
