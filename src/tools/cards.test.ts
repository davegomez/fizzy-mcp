import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError, NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import {
	createCardTool,
	deleteCardTool,
	getCardTool,
	listCardsTool,
	updateCardTool,
} from "./cards.js";

const mockCard = {
	id: "card_1",
	number: 42,
	title: "Fix authentication bug",
	description_html: "<p>Users are getting logged out unexpectedly</p>",
	status: "open" as const,
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

const mockCardLongDescription = {
	...mockCard,
	id: "card_2",
	number: 43,
	description_html:
		"<p>This is a very long description that should be truncated when displayed in the list view because it exceeds the maximum length of 100 characters which is our limit.</p>",
};

describe("listCardsTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const listCardsFn = vi.fn().mockResolvedValue(ok([mockCard]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
		} as unknown as client.FizzyClient);

		await listCardsTool.execute({ account_slug: "my-account" });
		expect(listCardsFn).toHaveBeenCalledWith("my-account", {
			board_id: undefined,
			column_id: undefined,
			tag_ids: undefined,
			assignee_ids: undefined,
			status: undefined,
		});
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const listCardsFn = vi.fn().mockResolvedValue(ok([]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
		} as unknown as client.FizzyClient);

		await listCardsTool.execute({});
		expect(listCardsFn).toHaveBeenCalledWith("default-account", {
			board_id: undefined,
			column_id: undefined,
			tag_ids: undefined,
			assignee_ids: undefined,
			status: undefined,
		});
	});

	test("should throw when no account and no default set", async () => {
		await expect(listCardsTool.execute({})).rejects.toThrow(
			"No account specified and no default set",
		);
	});

	test("should strip leading slash from account slug", async () => {
		const listCardsFn = vi.fn().mockResolvedValue(ok([]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
		} as unknown as client.FizzyClient);

		await listCardsTool.execute({ account_slug: "/897362094" });
		expect(listCardsFn).toHaveBeenCalledWith("897362094", expect.any(Object));
	});

	test("should pass filters to client", async () => {
		const listCardsFn = vi.fn().mockResolvedValue(ok([]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await listCardsTool.execute({
			board_id: "board_1",
			column_id: "col_1",
			tag_ids: ["tag_1", "tag_2"],
			assignee_ids: ["user_1"],
			status: "open",
		});

		expect(listCardsFn).toHaveBeenCalledWith("897362094", {
			board_id: "board_1",
			column_id: "col_1",
			tag_ids: ["tag_1", "tag_2"],
			assignee_ids: ["user_1"],
			status: "open",
		});
	});

	test("should format card list with truncated descriptions", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: vi.fn().mockResolvedValue(ok([mockCard])),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listCardsTool.execute({});

		expect(result).toContain("#42: Fix authentication bug");
		expect(result).toContain("Status: open");
		expect(result).toContain("Tags: bug");
		expect(result).toContain("Users are getting logged out unexpectedly");
	});

	test("should truncate long descriptions to 100 chars", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: vi.fn().mockResolvedValue(ok([mockCardLongDescription])),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listCardsTool.execute({});

		expect(result).toContain("...");
		// Original description was >100 chars, should be truncated
		const descriptionLine = result
			.split("\n")
			.find((l) => l.includes("This is a very"));
		expect(descriptionLine).toBeDefined();
		// 100 chars + "..." + possible prefix whitespace
		expect(descriptionLine?.length).toBeLessThan(120);
	});

	test("should return message when no cards found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: vi.fn().mockResolvedValue(ok([])),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listCardsTool.execute({});

		expect(result).toBe("No cards found.");
	});

	test("should throw UserError on API error", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: vi.fn().mockResolvedValue(err(new AuthenticationError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(listCardsTool.execute({})).rejects.toThrow(
			"Authentication failed",
		);
	});
});

describe("getCardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
		} as unknown as client.FizzyClient);

		await getCardTool.execute({ account_slug: "my-account", card_number: 42 });
		expect(getCardFn).toHaveBeenCalledWith("my-account", 42);
	});

	test("should throw when no account and no default set", async () => {
		await expect(getCardTool.execute({ card_number: 42 })).rejects.toThrow(
			"No account specified and no default set",
		);
	});

	test("should return JSON with markdown description", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: vi.fn().mockResolvedValue(ok(mockCard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
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
		const cardNoDesc = { ...mockCard, description_html: null };
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: vi.fn().mockResolvedValue(ok(cardNoDesc)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await getCardTool.execute({ card_number: 42 });

		const parsed = JSON.parse(result);
		expect(parsed.description).toBeNull();
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(getCardTool.execute({ card_number: 999 })).rejects.toThrow(
			"Resource not found",
		);
	});
});

describe("createCardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const createCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createCard: createCardFn,
		} as unknown as client.FizzyClient);

		await createCardTool.execute({
			account_slug: "my-account",
			board_id: "board_1",
			title: "New Card",
		});
		expect(createCardFn).toHaveBeenCalledWith("my-account", "board_1", {
			title: "New Card",
			description: undefined,
		});
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			createCardTool.execute({ board_id: "board_1", title: "New Card" }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should pass description to client", async () => {
		const createCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createCard: createCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await createCardTool.execute({
			board_id: "board_1",
			title: "New Card",
			description: "# Task Details",
		});
		expect(createCardFn).toHaveBeenCalledWith("897362094", "board_1", {
			title: "New Card",
			description: "# Task Details",
		});
	});

	test("should return created card summary", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createCard: vi.fn().mockResolvedValue(ok(mockCard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await createCardTool.execute({
			board_id: "board_1",
			title: "New Card",
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("card_1");
		expect(parsed.number).toBe(42);
		expect(parsed.title).toBe("Fix authentication bug");
		expect(parsed.url).toBe("https://app.fizzy.do/897362094/cards/42");
	});
});

describe("updateCardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const updateCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateCard: updateCardFn,
		} as unknown as client.FizzyClient);

		await updateCardTool.execute({
			account_slug: "my-account",
			card_number: 42,
			title: "Updated Title",
		});
		expect(updateCardFn).toHaveBeenCalledWith("my-account", 42, {
			title: "Updated Title",
			description: undefined,
		});
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			updateCardTool.execute({ card_number: 42, title: "Updated" }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should handle partial updates - title only", async () => {
		const updateCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateCard: updateCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await updateCardTool.execute({
			card_number: 42,
			title: "New Title",
		});
		expect(updateCardFn).toHaveBeenCalledWith("897362094", 42, {
			title: "New Title",
			description: undefined,
		});
	});

	test("should handle partial updates - description only", async () => {
		const updateCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateCard: updateCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await updateCardTool.execute({
			card_number: 42,
			description: "New description",
		});
		expect(updateCardFn).toHaveBeenCalledWith("897362094", 42, {
			title: undefined,
			description: "New description",
		});
	});

	test("should pass both title and description to client", async () => {
		const updateCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateCard: updateCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await updateCardTool.execute({
			card_number: 42,
			title: "New Title",
			description: "New desc",
		});
		expect(updateCardFn).toHaveBeenCalledWith("897362094", 42, {
			title: "New Title",
			description: "New desc",
		});
	});

	test("should return updated card details", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateCard: vi.fn().mockResolvedValue(ok(mockCard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await updateCardTool.execute({
			card_number: 42,
			title: "Updated",
		});

		const parsed = JSON.parse(result);
		expect(parsed.number).toBe(42);
		expect(parsed.title).toBe("Fix authentication bug");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			updateCardTool.execute({ card_number: 999, title: "Test" }),
		).rejects.toThrow("Resource not found");
	});
});

describe("deleteCardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const deleteCardFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteCard: deleteCardFn,
		} as unknown as client.FizzyClient);

		await deleteCardTool.execute({
			account_slug: "my-account",
			card_number: 42,
		});
		expect(deleteCardFn).toHaveBeenCalledWith("my-account", 42);
	});

	test("should throw when no account and no default set", async () => {
		await expect(deleteCardTool.execute({ card_number: 42 })).rejects.toThrow(
			"No account specified and no default set",
		);
	});

	test("should return success message", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteCard: vi.fn().mockResolvedValue(ok(undefined)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await deleteCardTool.execute({ card_number: 42 });

		expect(result).toBe("Card #42 deleted.");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(deleteCardTool.execute({ card_number: 999 })).rejects.toThrow(
			"Resource not found",
		);
	});
});
