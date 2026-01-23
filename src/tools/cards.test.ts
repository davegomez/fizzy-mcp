import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError, NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import {
	closeCardTool,
	createCardTool,
	deleteCardTool,
	getCardTool,
	listCardsTool,
	notNowCardTool,
	reopenCardTool,
	toggleAssigneeTool,
	toggleTagTool,
	triageCardTool,
	unTriageCardTool,
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

describe("toggleTagTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			toggleTag: toggleTagFn,
		} as unknown as client.FizzyClient);

		await toggleTagTool.execute({
			account_slug: "my-account",
			card_number: 42,
			tag_title: "Bug",
		});
		expect(toggleTagFn).toHaveBeenCalledWith("my-account", 42, "Bug");
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			toggleTag: toggleTagFn,
		} as unknown as client.FizzyClient);

		await toggleTagTool.execute({ card_number: 42, tag_title: "Bug" });
		expect(toggleTagFn).toHaveBeenCalledWith("default-account", 42, "Bug");
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			toggleTagTool.execute({ card_number: 42, tag_title: "Bug" }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should return confirmation message", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			toggleTag: vi.fn().mockResolvedValue(ok(undefined)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await toggleTagTool.execute({
			card_number: 42,
			tag_title: "Bug",
		});

		expect(result).toBe('Toggled tag "Bug" on card #42.');
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			toggleTag: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			toggleTagTool.execute({ card_number: 999, tag_title: "Bug" }),
		).rejects.toThrow("Resource not found");
	});
});

describe("toggleAssigneeTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const toggleAssigneeFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			toggleAssignee: toggleAssigneeFn,
		} as unknown as client.FizzyClient);

		await toggleAssigneeTool.execute({
			account_slug: "my-account",
			card_number: 42,
			user_id: "user_1",
		});
		expect(toggleAssigneeFn).toHaveBeenCalledWith("my-account", 42, "user_1");
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const toggleAssigneeFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			toggleAssignee: toggleAssigneeFn,
		} as unknown as client.FizzyClient);

		await toggleAssigneeTool.execute({ card_number: 42, user_id: "user_1" });
		expect(toggleAssigneeFn).toHaveBeenCalledWith(
			"default-account",
			42,
			"user_1",
		);
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			toggleAssigneeTool.execute({ card_number: 42, user_id: "user_1" }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should return confirmation message", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			toggleAssignee: vi.fn().mockResolvedValue(ok(undefined)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await toggleAssigneeTool.execute({
			card_number: 42,
			user_id: "user_1",
		});

		expect(result).toBe('Toggled assignee "user_1" on card #42.');
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			toggleAssignee: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			toggleAssigneeTool.execute({ card_number: 999, user_id: "user_1" }),
		).rejects.toThrow("Resource not found");
	});
});

describe("closeCardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should call client.closeCard with correct args", async () => {
		const closedCard = { ...mockCard, status: "closed" as const };
		const closeCardFn = vi.fn().mockResolvedValue(ok(closedCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		await closeCardTool.execute({
			account_slug: "my-account",
			card_number: 42,
		});
		expect(closeCardFn).toHaveBeenCalledWith("my-account", 42);
	});

	test("should return confirmation message with status", async () => {
		const closedCard = { ...mockCard, status: "closed" as const };
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			closeCard: vi.fn().mockResolvedValue(ok(closedCard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await closeCardTool.execute({ card_number: 42 });

		expect(result).toBe("Card #42 closed. Status: closed");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			closeCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(closeCardTool.execute({ card_number: 999 })).rejects.toThrow(
			"Resource not found",
		);
	});
});

describe("reopenCardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should call client.reopenCard with correct args", async () => {
		const reopenedCard = { ...mockCard, status: "open" as const };
		const reopenCardFn = vi.fn().mockResolvedValue(ok(reopenedCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			reopenCard: reopenCardFn,
		} as unknown as client.FizzyClient);

		await reopenCardTool.execute({
			account_slug: "my-account",
			card_number: 42,
		});
		expect(reopenCardFn).toHaveBeenCalledWith("my-account", 42);
	});

	test("should return confirmation message with status", async () => {
		const reopenedCard = { ...mockCard, status: "open" as const };
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			reopenCard: vi.fn().mockResolvedValue(ok(reopenedCard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await reopenCardTool.execute({ card_number: 42 });

		expect(result).toBe("Card #42 reopened. Status: open");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			reopenCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(reopenCardTool.execute({ card_number: 999 })).rejects.toThrow(
			"Resource not found",
		);
	});
});

describe("triageCardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should call client.triageCard with column_id", async () => {
		const triagedCard = { ...mockCard, column_id: "col_2" };
		const triageCardFn = vi.fn().mockResolvedValue(ok(triagedCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			triageCard: triageCardFn,
		} as unknown as client.FizzyClient);

		await triageCardTool.execute({
			account_slug: "my-account",
			card_number: 42,
			column_id: "col_2",
		});
		expect(triageCardFn).toHaveBeenCalledWith(
			"my-account",
			42,
			"col_2",
			undefined,
		);
	});

	test("should call client.triageCard with position", async () => {
		const triagedCard = { ...mockCard, column_id: "col_2" };
		const triageCardFn = vi.fn().mockResolvedValue(ok(triagedCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			triageCard: triageCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await triageCardTool.execute({
			card_number: 42,
			column_id: "col_2",
			position: "top",
		});
		expect(triageCardFn).toHaveBeenCalledWith("897362094", 42, "col_2", "top");
	});

	test("should return confirmation message", async () => {
		const triagedCard = { ...mockCard, column_id: "col_2" };
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			triageCard: vi.fn().mockResolvedValue(ok(triagedCard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await triageCardTool.execute({
			card_number: 42,
			column_id: "col_2",
		});

		expect(result).toBe("Card #42 triaged to column col_2.");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			triageCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			triageCardTool.execute({ card_number: 999, column_id: "col_1" }),
		).rejects.toThrow("Resource not found");
	});
});

describe("unTriageCardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should call client.unTriageCard with correct args", async () => {
		const untriagedCard = { ...mockCard, column_id: null };
		const unTriageCardFn = vi.fn().mockResolvedValue(ok(untriagedCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			unTriageCard: unTriageCardFn,
		} as unknown as client.FizzyClient);

		await unTriageCardTool.execute({
			account_slug: "my-account",
			card_number: 42,
		});
		expect(unTriageCardFn).toHaveBeenCalledWith("my-account", 42);
	});

	test("should return confirmation message", async () => {
		const untriagedCard = { ...mockCard, column_id: null };
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			unTriageCard: vi.fn().mockResolvedValue(ok(untriagedCard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await unTriageCardTool.execute({ card_number: 42 });

		expect(result).toBe("Card #42 moved back to inbox.");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			unTriageCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			unTriageCardTool.execute({ card_number: 999 }),
		).rejects.toThrow("Resource not found");
	});
});

describe("notNowCardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should call client.notNowCard with correct args", async () => {
		const deferredCard = { ...mockCard, status: "deferred" as const };
		const notNowCardFn = vi.fn().mockResolvedValue(ok(deferredCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			notNowCard: notNowCardFn,
		} as unknown as client.FizzyClient);

		await notNowCardTool.execute({
			account_slug: "my-account",
			card_number: 42,
		});
		expect(notNowCardFn).toHaveBeenCalledWith("my-account", 42);
	});

	test("should return confirmation message with status", async () => {
		const deferredCard = { ...mockCard, status: "deferred" as const };
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			notNowCard: vi.fn().mockResolvedValue(ok(deferredCard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await notNowCardTool.execute({ card_number: 42 });

		expect(result).toBe("Card #42 deferred. Status: deferred");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			notNowCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(notNowCardTool.execute({ card_number: 999 })).rejects.toThrow(
			"Resource not found",
		);
	});
});
