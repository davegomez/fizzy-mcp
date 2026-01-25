import { beforeEach, describe, expect, test, vi } from "vitest";
import { NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { ENV_TOKEN } from "../config.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { taskTool } from "./task.js";

const mockCard = {
	id: "card_1",
	number: 42,
	title: "Test Card",
	description_html: null,
	status: "open" as const,
	board_id: "board_1",
	column_id: null,
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

describe("taskTool - create mode", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should throw when board_id missing in create mode", async () => {
		setDefaultAccount("test-account");
		await expect(
			taskTool.execute({ title: "New Card", position: "bottom" }),
		).rejects.toThrow("Create mode requires board_id");
	});

	test("should throw when title missing in create mode", async () => {
		setDefaultAccount("test-account");
		await expect(
			taskTool.execute({ board_id: "board_1", position: "bottom" }),
		).rejects.toThrow("Create mode requires title");
	});

	test("should create basic card", async () => {
		const createCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createCard: createCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			board_id: "board_1",
			title: "New Card",
			position: "bottom",
		});

		expect(createCardFn).toHaveBeenCalledWith("test-account", "board_1", {
			title: "New Card",
			description: undefined,
		});

		const parsed = JSON.parse(result);
		expect(parsed.mode).toBe("create");
		expect(parsed.card.number).toBe(42);
	});

	test("should create card with steps", async () => {
		const createCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		const createStepFn = vi.fn().mockResolvedValue(ok({ id: "step_1" }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createCard: createCardFn,
			createStep: createStepFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			board_id: "board_1",
			title: "New Card",
			steps: ["Step 1", "Step 2"],
			position: "bottom",
		});

		expect(createStepFn).toHaveBeenCalledTimes(2);
		const parsed = JSON.parse(result);
		expect(parsed.operations.steps_created).toBe(2);
	});

	test("should create card with tags", async () => {
		const createCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createCard: createCardFn,
			toggleTag: toggleTagFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			board_id: "board_1",
			title: "New Card",
			add_tags: ["Feature"],
			position: "bottom",
		});

		expect(toggleTagFn).toHaveBeenCalledWith("test-account", 42, "Feature");
		const parsed = JSON.parse(result);
		expect(parsed.operations.tags_added).toEqual(["Feature"]);
	});

	test("should create card with triage", async () => {
		const createCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		const triageCardFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockCard, column_id: "col_1" }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createCard: createCardFn,
			triageCard: triageCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			board_id: "board_1",
			title: "New Card",
			column_id: "col_1",
			position: "top",
		});

		expect(triageCardFn).toHaveBeenCalledWith(
			"test-account",
			42,
			"col_1",
			"top",
		);
		const parsed = JSON.parse(result);
		expect(parsed.operations.triaged_to).toBe("col_1");
	});

	test("should report partial failures", async () => {
		const createCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		const createStepFn = vi
			.fn()
			.mockResolvedValueOnce(ok({ id: "step_1" }))
			.mockResolvedValueOnce(err(new NotFoundError()));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createCard: createCardFn,
			createStep: createStepFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			board_id: "board_1",
			title: "New Card",
			steps: ["Step 1", "Step 2"],
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.steps_created).toBe(1);
		expect(parsed.failures).toHaveLength(1);
		expect(parsed.failures[0].operation).toBe("create_step:Step 2");
	});
});

describe("taskTool - update mode", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should update title", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		const updateCardFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockCard, title: "Updated" }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			updateCard: updateCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			title: "Updated",
			position: "bottom",
		});

		expect(updateCardFn).toHaveBeenCalledWith("test-account", 42, {
			title: "Updated",
			description: undefined,
		});
		const parsed = JSON.parse(result);
		expect(parsed.mode).toBe("update");
		expect(parsed.operations.title_updated).toBe(true);
	});

	test("should change status to closed", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		const closeCardFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockCard, status: "closed" }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			status: "closed",
			position: "bottom",
		});

		expect(closeCardFn).toHaveBeenCalledWith("test-account", 42);
		const parsed = JSON.parse(result);
		expect(parsed.operations.status_changed).toBe("closed");
	});

	test("should change status to not_now", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		const notNowCardFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			notNowCard: notNowCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			status: "not_now",
			position: "bottom",
		});

		expect(notNowCardFn).toHaveBeenCalledWith("test-account", 42);
		const parsed = JSON.parse(result);
		expect(parsed.operations.status_changed).toBe("not_now");
		expect(parsed.card.status).toBe("deferred");
	});

	test("should add tags with pre-check", async () => {
		const cardWithoutTag = { ...mockCard, tags: [] };
		const getCardFn = vi.fn().mockResolvedValue(ok(cardWithoutTag));
		const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			toggleTag: toggleTagFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			add_tags: ["Feature"],
			position: "bottom",
		});

		expect(toggleTagFn).toHaveBeenCalledWith("test-account", 42, "Feature");
		const parsed = JSON.parse(result);
		expect(parsed.operations.tags_added).toEqual(["Feature"]);
	});

	test("should skip adding tag if already present", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard)); // Has "Bug" tag
		const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			toggleTag: toggleTagFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			add_tags: ["Bug"], // Already on card
			position: "bottom",
		});

		expect(toggleTagFn).not.toHaveBeenCalled();
		const parsed = JSON.parse(result);
		expect(parsed.operations.tags_added).toBeUndefined();
	});

	test("should remove tags with pre-check", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard)); // Has "Bug" tag
		const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			toggleTag: toggleTagFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			remove_tags: ["Bug"],
			position: "bottom",
		});

		expect(toggleTagFn).toHaveBeenCalledWith("test-account", 42, "Bug");
		const parsed = JSON.parse(result);
		expect(parsed.operations.tags_removed).toEqual(["Bug"]);
	});

	test("should skip removing tag if not present", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard)); // Has "Bug" tag
		const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			toggleTag: toggleTagFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			remove_tags: ["Feature"], // Not on card
			position: "bottom",
		});

		expect(toggleTagFn).not.toHaveBeenCalled();
		const parsed = JSON.parse(result);
		expect(parsed.operations.tags_removed).toBeUndefined();
	});

	test("should throw when card not found", async () => {
		const getCardFn = vi.fn().mockResolvedValue(err(new NotFoundError()));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		await expect(
			taskTool.execute({ card_number: 999, title: "Test", position: "bottom" }),
		).rejects.toThrow("[NOT_FOUND] Card #999");
	});

	test("should handle void return from closeCard", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		const closeCardFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			closeCard: closeCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			status: "closed",
			position: "bottom",
		});

		expect(closeCardFn).toHaveBeenCalledWith("test-account", 42);
		const parsed = JSON.parse(result);
		expect(parsed.operations.status_changed).toBe("closed");
		expect(parsed.card.status).toBe("closed");
	});

	test("should handle void return from reopenCard", async () => {
		const closedCard = { ...mockCard, status: "closed" as const };
		const getCardFn = vi.fn().mockResolvedValue(ok(closedCard));
		const reopenCardFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			reopenCard: reopenCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			status: "open",
			position: "bottom",
		});

		expect(reopenCardFn).toHaveBeenCalledWith("test-account", 42);
		const parsed = JSON.parse(result);
		expect(parsed.operations.status_changed).toBe("open");
		expect(parsed.card.status).toBe("open");
	});

	test("should call unTriageCard before triageCard when card already in column", async () => {
		const cardInColumn = { ...mockCard, column_id: "old_col" };
		const getCardFn = vi.fn().mockResolvedValue(ok(cardInColumn));
		const unTriageCardFn = vi.fn().mockResolvedValue(ok(undefined));
		const triageCardFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			unTriageCard: unTriageCardFn,
			triageCard: triageCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			column_id: "new_col",
			position: "top",
		});

		expect(unTriageCardFn).toHaveBeenCalledWith("test-account", 42);
		expect(triageCardFn).toHaveBeenCalledWith(
			"test-account",
			42,
			"new_col",
			"top",
		);
		const parsed = JSON.parse(result);
		expect(parsed.operations.triaged_to).toBe("new_col");
	});

	test("should not call unTriageCard when card has no column", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard)); // column_id: null
		const unTriageCardFn = vi.fn().mockResolvedValue(ok(undefined));
		const triageCardFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			unTriageCard: unTriageCardFn,
			triageCard: triageCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			column_id: "new_col",
			position: "bottom",
		});

		expect(unTriageCardFn).not.toHaveBeenCalled();
		expect(triageCardFn).toHaveBeenCalledWith(
			"test-account",
			42,
			"new_col",
			"bottom",
		);
		const parsed = JSON.parse(result);
		expect(parsed.operations.triaged_to).toBe("new_col");
	});

	test("should not call triageCard when unTriageCard fails", async () => {
		const cardInColumn = { ...mockCard, column_id: "old_col" };
		const getCardFn = vi.fn().mockResolvedValue(ok(cardInColumn));
		const unTriageCardFn = vi
			.fn()
			.mockResolvedValue(err(new Error("Untriage failed")));
		const triageCardFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			unTriageCard: unTriageCardFn,
			triageCard: triageCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			column_id: "new_col",
			position: "top",
		});

		expect(unTriageCardFn).toHaveBeenCalledWith("test-account", 42);
		expect(triageCardFn).not.toHaveBeenCalled();
		const parsed = JSON.parse(result);
		expect(parsed.failures).toHaveLength(1);
		expect(parsed.failures[0].operation).toBe("untriage");
		expect(parsed.operations.triaged_to).toBeUndefined();
	});

	test("should skip untriage and triage when column unchanged", async () => {
		const cardInColumn = { ...mockCard, column_id: "same_col" };
		const getCardFn = vi.fn().mockResolvedValue(ok(cardInColumn));
		const unTriageCardFn = vi.fn().mockResolvedValue(ok(undefined));
		const triageCardFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
			unTriageCard: unTriageCardFn,
			triageCard: triageCardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			column_id: "same_col",
			position: "top",
		});

		expect(unTriageCardFn).not.toHaveBeenCalled();
		expect(triageCardFn).not.toHaveBeenCalled();
		const parsed = JSON.parse(result);
		expect(parsed.operations.triaged_to).toBeUndefined();
	});
});

describe("taskTool - account resolution", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			taskTool.execute({
				board_id: "board_1",
				title: "Test",
				position: "bottom",
			}),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should use account_slug from args", async () => {
		const createCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createCard: createCardFn,
		} as unknown as client.FizzyClient);

		await taskTool.execute({
			account_slug: "my-account",
			board_id: "board_1",
			title: "Test",
			position: "bottom",
		});

		expect(createCardFn).toHaveBeenCalledWith("my-account", "board_1", {
			title: "Test",
			description: undefined,
		});
	});
});
