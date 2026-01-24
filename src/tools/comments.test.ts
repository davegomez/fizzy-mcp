import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	AuthenticationError,
	ForbiddenError,
	NotFoundError,
} from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import {
	createCommentTool,
	deleteCommentTool,
	listCommentsTool,
	updateCommentTool,
} from "./comments.js";

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

const mockCommentLongBody = {
	...mockComment,
	id: "comment_2",
	body: {
		plain_text:
			"This is a very long comment that should be truncated when displayed in the list view because it exceeds the maximum length of 150 characters which is our limit for comment bodies in the listing.",
		html: "<p>This is a very long comment that should be truncated when displayed in the list view because it exceeds the maximum length of 150 characters which is our limit for comment bodies in the listing.</p>",
	},
};

describe("listCommentsTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	const mockPaginatedResult = {
		items: [mockComment],
		pagination: { returned: 1, has_more: false },
	};

	test("should resolve account from args", async () => {
		const listCommentsFn = vi.fn().mockResolvedValue(ok(mockPaginatedResult));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listComments: listCommentsFn,
		} as unknown as client.FizzyClient);

		await listCommentsTool.execute({
			account_slug: "my-account",
			card_number: 42,
			limit: 25,
		});
		expect(listCommentsFn).toHaveBeenCalledWith("my-account", 42, {
			limit: 25,
			cursor: undefined,
		});
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const listCommentsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listComments: listCommentsFn,
		} as unknown as client.FizzyClient);

		await listCommentsTool.execute({ card_number: 42, limit: 25 });
		expect(listCommentsFn).toHaveBeenCalledWith("default-account", 42, {
			limit: 25,
			cursor: undefined,
		});
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			listCommentsTool.execute({ card_number: 42, limit: 25 }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should strip leading slash from account slug", async () => {
		const listCommentsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listComments: listCommentsFn,
		} as unknown as client.FizzyClient);

		await listCommentsTool.execute({
			account_slug: "/897362094",
			card_number: 42,
			limit: 25,
		});
		expect(listCommentsFn).toHaveBeenCalledWith("897362094", 42, {
			limit: 25,
			cursor: undefined,
		});
	});

	test("should return JSON with paginated comment list", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listComments: vi.fn().mockResolvedValue(ok(mockPaginatedResult)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listCommentsTool.execute({
			card_number: 42,
			limit: 25,
		});

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].id).toBe("comment_1");
		expect(parsed.pagination.returned).toBe(1);
	});

	test("should include raw body with html and plain_text", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listComments: vi.fn().mockResolvedValue(ok(mockPaginatedResult)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listCommentsTool.execute({
			card_number: 42,
			limit: 25,
		});

		const parsed = JSON.parse(result);
		expect(parsed.items[0].body.plain_text).toBe("This looks good to me!");
		expect(parsed.items[0].body.html).toBe("<p>This looks good to me!</p>");
	});

	test("should return empty items array when no comments found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listComments: vi
				.fn()
				.mockResolvedValue(
					ok({ items: [], pagination: { returned: 0, has_more: false } }),
				),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listCommentsTool.execute({
			card_number: 42,
			limit: 25,
		});

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(0);
		expect(parsed.pagination.returned).toBe(0);
	});

	test("should throw UserError on API error", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listComments: vi.fn().mockResolvedValue(err(new AuthenticationError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			listCommentsTool.execute({ card_number: 42, limit: 25 }),
		).rejects.toThrow("Authentication failed");
	});
});

describe("createCommentTool", () => {
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

		await createCommentTool.execute({
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

	test("should throw when no account and no default set", async () => {
		await expect(
			createCommentTool.execute({ card_number: 42, body: "Test" }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should return created comment as JSON", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createComment: vi.fn().mockResolvedValue(ok(mockComment)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await createCommentTool.execute({
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
			createCommentTool.execute({ card_number: 999, body: "Test" }),
		).rejects.toThrow("[NOT_FOUND] Comment");
	});
});

describe("updateCommentTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const updateCommentFn = vi.fn().mockResolvedValue(ok(mockComment));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateComment: updateCommentFn,
		} as unknown as client.FizzyClient);

		await updateCommentTool.execute({
			account_slug: "my-account",
			card_number: 42,
			comment_id: "comment_1",
			body: "Updated comment",
		});
		expect(updateCommentFn).toHaveBeenCalledWith(
			"my-account",
			42,
			"comment_1",
			"Updated comment",
		);
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			updateCommentTool.execute({
				card_number: 42,
				comment_id: "comment_1",
				body: "Test",
			}),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should return updated comment as JSON", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateComment: vi.fn().mockResolvedValue(ok(mockComment)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await updateCommentTool.execute({
			card_number: 42,
			comment_id: "comment_1",
			body: "Updated",
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("comment_1");
		expect(parsed.body).toBe("This looks good to me!");
	});

	test("should throw UserError on forbidden (non-author)", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateComment: vi.fn().mockResolvedValue(err(new ForbiddenError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			updateCommentTool.execute({
				card_number: 42,
				comment_id: "comment_1",
				body: "Test",
			}),
		).rejects.toThrow("[FORBIDDEN] Comment comment_1");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateComment: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			updateCommentTool.execute({
				card_number: 42,
				comment_id: "nonexistent",
				body: "Test",
			}),
		).rejects.toThrow("[NOT_FOUND] Comment nonexistent");
	});
});

describe("deleteCommentTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should throw when force is false", async () => {
		setDefaultAccount("897362094");
		await expect(
			deleteCommentTool.execute({
				card_number: 42,
				comment_id: "comment_1",
				force: false,
			}),
		).rejects.toThrow("Deletion requires force=true");
	});

	test("should resolve account from args when force is true", async () => {
		const deleteCommentFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteComment: deleteCommentFn,
		} as unknown as client.FizzyClient);

		await deleteCommentTool.execute({
			account_slug: "my-account",
			card_number: 42,
			comment_id: "comment_1",
			force: true,
		});
		expect(deleteCommentFn).toHaveBeenCalledWith("my-account", 42, "comment_1");
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			deleteCommentTool.execute({
				card_number: 42,
				comment_id: "comment_1",
				force: true,
			}),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should return success message", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteComment: vi.fn().mockResolvedValue(ok(undefined)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await deleteCommentTool.execute({
			card_number: 42,
			comment_id: "comment_1",
			force: true,
		});

		expect(result).toBe("Comment comment_1 deleted from card #42.");
	});

	test("should throw UserError on forbidden (non-author)", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteComment: vi.fn().mockResolvedValue(err(new ForbiddenError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			deleteCommentTool.execute({
				card_number: 42,
				comment_id: "comment_1",
				force: true,
			}),
		).rejects.toThrow("[FORBIDDEN] Comment comment_1");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteComment: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			deleteCommentTool.execute({
				card_number: 999,
				comment_id: "nonexistent",
				force: true,
			}),
		).rejects.toThrow("[NOT_FOUND] Comment nonexistent");
	});
});
