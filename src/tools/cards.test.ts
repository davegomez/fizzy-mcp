import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError, NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { ENV_TOKEN } from "../config.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { getCardTool, searchTool } from "./cards.js";

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

describe("searchTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should resolve account from args", async () => {
		const listCardsFn = vi.fn().mockResolvedValue(
			ok({
				items: [mockCard],
				pagination: { returned: 1, has_more: false },
			}),
		);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
		} as unknown as client.FizzyClient);

		await searchTool.execute({ account_slug: "my-account", limit: 25 });
		expect(listCardsFn).toHaveBeenCalledWith(
			"my-account",
			{
				board_id: undefined,
				column_id: undefined,
				tag_ids: undefined,
				assignee_ids: undefined,
				status: undefined,
			},
			{ limit: 25, cursor: undefined },
		);
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const listCardsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
		} as unknown as client.FizzyClient);

		await searchTool.execute({ limit: 25 });
		expect(listCardsFn).toHaveBeenCalledWith(
			"default-account",
			{
				board_id: undefined,
				column_id: undefined,
				tag_ids: undefined,
				assignee_ids: undefined,
				status: undefined,
			},
			{ limit: 25, cursor: undefined },
		);
	});

	test("should throw when no account and no default set", async () => {
		await expect(searchTool.execute({})).rejects.toThrow(
			"No account specified and no default set",
		);
	});

	test("should strip leading slash from account slug", async () => {
		const listCardsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
		} as unknown as client.FizzyClient);

		await searchTool.execute({ account_slug: "/897362094", limit: 25 });
		expect(listCardsFn).toHaveBeenCalledWith(
			"897362094",
			expect.any(Object),
			expect.any(Object),
		);
	});

	test("should pass filters to client", async () => {
		const listCardsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: listCardsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await searchTool.execute({
			board_id: "board_1",
			column_id: "col_1",
			tag_ids: ["tag_1", "tag_2"],
			assignee_ids: ["user_1"],
			status: "open",
			limit: 25,
		});

		expect(listCardsFn).toHaveBeenCalledWith(
			"897362094",
			{
				board_id: "board_1",
				column_id: "col_1",
				tag_ids: ["tag_1", "tag_2"],
				assignee_ids: ["user_1"],
				status: "open",
			},
			{ limit: 25, cursor: undefined },
		);
	});

	test("should return JSON with items and pagination", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: vi.fn().mockResolvedValue(
				ok({
					items: [mockCard],
					pagination: { returned: 1, has_more: true, next_cursor: "abc123" },
				}),
			),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await searchTool.execute({ limit: 25 });
		const parsed = JSON.parse(result);

		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].number).toBe(42);
		expect(parsed.pagination.returned).toBe(1);
		expect(parsed.pagination.has_more).toBe(true);
		expect(parsed.pagination.next_cursor).toBe("abc123");
	});

	test("should return empty items array when no cards found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: vi
				.fn()
				.mockResolvedValue(
					ok({ items: [], pagination: { returned: 0, has_more: false } }),
				),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await searchTool.execute({ limit: 25 });
		const parsed = JSON.parse(result);

		expect(parsed.items).toHaveLength(0);
		expect(parsed.pagination.has_more).toBe(false);
	});

	test("should throw UserError on API error", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listCards: vi.fn().mockResolvedValue(err(new AuthenticationError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(searchTool.execute({ limit: 25 })).rejects.toThrow(
			"Authentication failed",
		);
	});
});

describe("getCardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should fetch card by number", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
		} as unknown as client.FizzyClient);

		await getCardTool.execute({ account_slug: "my-account", card_number: 42 });
		expect(getCardFn).toHaveBeenCalledWith("my-account", 42);
	});

	test("should fetch card by ID when card_id provided", async () => {
		const getCardByIdFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCardById: getCardByIdFn,
		} as unknown as client.FizzyClient);

		await getCardTool.execute({
			account_slug: "my-account",
			card_id: "03fgjbkhgph377d3fbph6z2qj",
		});
		expect(getCardByIdFn).toHaveBeenCalledWith(
			"my-account",
			"03fgjbkhgph377d3fbph6z2qj",
		);
	});

	test("should prefer card_number over card_id when both provided", async () => {
		const getCardFn = vi.fn().mockResolvedValue(ok(mockCard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: getCardFn,
		} as unknown as client.FizzyClient);

		await getCardTool.execute({
			account_slug: "my-account",
			card_number: 42,
			card_id: "03fgjbkhgph377d3fbph6z2qj",
		});
		expect(getCardFn).toHaveBeenCalledWith("my-account", 42);
	});

	test("should throw when neither card_number nor card_id provided", async () => {
		setDefaultAccount("my-account");
		await expect(getCardTool.execute({})).rejects.toThrow(
			"Either card_number or card_id must be provided",
		);
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

	test("should throw UserError on not found by number", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(getCardTool.execute({ card_number: 999 })).rejects.toThrow(
			"[NOT_FOUND] Card #999",
		);
	});

	test("should throw UserError on not found by ID", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getCardById: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			getCardTool.execute({ card_id: "nonexistent_id" }),
		).rejects.toThrow("[NOT_FOUND] Card nonexistent_id");
	});

	describe("schema validation", () => {
		test("should use strict schema that rejects unknown keys", () => {
			// Verify the schema rejects unknown parameters
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
