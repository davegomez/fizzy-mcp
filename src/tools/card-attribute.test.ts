import { beforeEach, describe, expect, test, vi } from "vitest";
import { NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { toggleCardAttributeTool } from "./card-attribute.js";

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

const mockCardNoTags = {
	...mockCard,
	tags: [],
};

const mockCardNoAssignees = {
	...mockCard,
	assignees: [],
};

const mockCardWithFeatureTag = {
	...mockCard,
	tags: [
		{ id: "tag_1", title: "bug", color: "red" },
		{ id: "tag_2", title: "feature", color: "blue" },
	],
};

const mockCardWithTwoAssignees = {
	...mockCard,
	assignees: [
		{ id: "user_1", name: "Alice", email_address: "alice@example.com" },
		{ id: "user_2", name: "Bob", email_address: "bob@example.com" },
	],
};

describe("toggleCardAttributeTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	describe("parameter validation", () => {
		test("tag attribute without tag_title throws UserError", async () => {
			setDefaultAccount("897362094");
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 42,
					attribute: "tag",
					operation: "add",
				}),
			).rejects.toThrow(
				"Attribute 'tag' requires tag_title. Use fizzy_list_tags to find tag names.",
			);
		});

		test("assignee attribute without user_id throws UserError", async () => {
			setDefaultAccount("897362094");
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 42,
					attribute: "assignee",
					operation: "add",
				}),
			).rejects.toThrow(
				"Attribute 'assignee' requires user_id. Use fizzy_whoami to find user IDs.",
			);
		});
	});

	describe("account resolution", () => {
		test("resolves account from args", async () => {
			const getCardFn = vi.fn().mockResolvedValue(ok(mockCardNoTags));
			const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: toggleTagFn,
			} as unknown as client.FizzyClient);

			await toggleCardAttributeTool.execute({
				account_slug: "my-account",
				card_number: 42,
				attribute: "tag",
				operation: "add",
				tag_title: "bug",
			});
			expect(getCardFn).toHaveBeenCalledWith("my-account", 42);
		});

		test("resolves account from default when not provided", async () => {
			setDefaultAccount("default-account");
			const getCardFn = vi.fn().mockResolvedValue(ok(mockCardNoTags));
			const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: toggleTagFn,
			} as unknown as client.FizzyClient);

			await toggleCardAttributeTool.execute({
				card_number: 42,
				attribute: "tag",
				operation: "add",
				tag_title: "bug",
			});
			expect(getCardFn).toHaveBeenCalledWith("default-account", 42);
		});

		test("throws when no account and no default set", async () => {
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 42,
					attribute: "tag",
					operation: "add",
					tag_title: "bug",
				}),
			).rejects.toThrow("No account specified and no default set");
		});

		test("strips leading slash from account slug", async () => {
			const getCardFn = vi.fn().mockResolvedValue(ok(mockCardNoTags));
			const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: toggleTagFn,
			} as unknown as client.FizzyClient);

			await toggleCardAttributeTool.execute({
				account_slug: "/897362094",
				card_number: 42,
				attribute: "tag",
				operation: "add",
				tag_title: "bug",
			});
			expect(getCardFn).toHaveBeenCalledWith("897362094", 42);
		});
	});

	describe("add tag operation", () => {
		test("adds tag when not present", async () => {
			const getCardFn = vi
				.fn()
				.mockResolvedValueOnce(ok(mockCardNoTags))
				.mockResolvedValueOnce(ok(mockCard));
			const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: toggleTagFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await toggleCardAttributeTool.execute({
				card_number: 42,
				attribute: "tag",
				operation: "add",
				tag_title: "bug",
			});

			expect(toggleTagFn).toHaveBeenCalledWith("897362094", 42, "bug");
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("add");
			expect(parsed.attribute).toBe("tag");
			expect(parsed.card.number).toBe(42);
		});

		test("throws error when adding existing tag", async () => {
			const getCardFn = vi.fn().mockResolvedValue(ok(mockCard));
			const toggleTagFn = vi.fn();
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: toggleTagFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 42,
					attribute: "tag",
					operation: "add",
					tag_title: "bug",
				}),
			).rejects.toThrow("Tag 'bug' already on card #42. Current tags: [bug]");

			expect(toggleTagFn).not.toHaveBeenCalled();
		});
	});

	describe("remove tag operation", () => {
		test("removes tag when present", async () => {
			const getCardFn = vi
				.fn()
				.mockResolvedValueOnce(ok(mockCard))
				.mockResolvedValueOnce(ok(mockCardNoTags));
			const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: toggleTagFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await toggleCardAttributeTool.execute({
				card_number: 42,
				attribute: "tag",
				operation: "remove",
				tag_title: "bug",
			});

			expect(toggleTagFn).toHaveBeenCalledWith("897362094", 42, "bug");
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("remove");
			expect(parsed.attribute).toBe("tag");
		});

		test("throws error when removing absent tag", async () => {
			const getCardFn = vi.fn().mockResolvedValue(ok(mockCardNoTags));
			const toggleTagFn = vi.fn();
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: toggleTagFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 42,
					attribute: "tag",
					operation: "remove",
					tag_title: "feature",
				}),
			).rejects.toThrow("Tag 'feature' not on card #42. Current tags: [none]");

			expect(toggleTagFn).not.toHaveBeenCalled();
		});

		test("shows multiple current tags in error message", async () => {
			const getCardFn = vi.fn().mockResolvedValue(ok(mockCardWithFeatureTag));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: vi.fn(),
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 42,
					attribute: "tag",
					operation: "remove",
					tag_title: "urgent",
				}),
			).rejects.toThrow(
				"Tag 'urgent' not on card #42. Current tags: [bug, feature]",
			);
		});
	});

	describe("add assignee operation", () => {
		test("adds assignee when not present", async () => {
			const getCardFn = vi
				.fn()
				.mockResolvedValueOnce(ok(mockCardNoAssignees))
				.mockResolvedValueOnce(ok(mockCard));
			const toggleAssigneeFn = vi.fn().mockResolvedValue(ok(undefined));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleAssignee: toggleAssigneeFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await toggleCardAttributeTool.execute({
				card_number: 42,
				attribute: "assignee",
				operation: "add",
				user_id: "user_1",
			});

			expect(toggleAssigneeFn).toHaveBeenCalledWith("897362094", 42, "user_1");
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("add");
			expect(parsed.attribute).toBe("assignee");
			expect(parsed.card.number).toBe(42);
		});

		test("throws error when adding existing assignee", async () => {
			const getCardFn = vi.fn().mockResolvedValue(ok(mockCard));
			const toggleAssigneeFn = vi.fn();
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleAssignee: toggleAssigneeFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 42,
					attribute: "assignee",
					operation: "add",
					user_id: "user_1",
				}),
			).rejects.toThrow(
				"User user_1 already assigned to card #42. Current assignees: [Alice (user_1)]",
			);

			expect(toggleAssigneeFn).not.toHaveBeenCalled();
		});
	});

	describe("remove assignee operation", () => {
		test("removes assignee when present", async () => {
			const getCardFn = vi
				.fn()
				.mockResolvedValueOnce(ok(mockCard))
				.mockResolvedValueOnce(ok(mockCardNoAssignees));
			const toggleAssigneeFn = vi.fn().mockResolvedValue(ok(undefined));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleAssignee: toggleAssigneeFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await toggleCardAttributeTool.execute({
				card_number: 42,
				attribute: "assignee",
				operation: "remove",
				user_id: "user_1",
			});

			expect(toggleAssigneeFn).toHaveBeenCalledWith("897362094", 42, "user_1");
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("remove");
			expect(parsed.attribute).toBe("assignee");
		});

		test("throws error when removing absent assignee", async () => {
			const getCardFn = vi.fn().mockResolvedValue(ok(mockCardNoAssignees));
			const toggleAssigneeFn = vi.fn();
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleAssignee: toggleAssigneeFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 42,
					attribute: "assignee",
					operation: "remove",
					user_id: "user_2",
				}),
			).rejects.toThrow(
				"User user_2 not assigned to card #42. Current assignees: [none]",
			);

			expect(toggleAssigneeFn).not.toHaveBeenCalled();
		});

		test("shows multiple current assignees in error message", async () => {
			const getCardFn = vi.fn().mockResolvedValue(ok(mockCardWithTwoAssignees));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleAssignee: vi.fn(),
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 42,
					attribute: "assignee",
					operation: "remove",
					user_id: "user_3",
				}),
			).rejects.toThrow(
				"User user_3 not assigned to card #42. Current assignees: [Alice (user_1), Bob (user_2)]",
			);
		});
	});

	describe("return format", () => {
		test("returns action, attribute, and full card object", async () => {
			const getCardFn = vi
				.fn()
				.mockResolvedValueOnce(ok(mockCardNoTags))
				.mockResolvedValueOnce(ok(mockCard));
			const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: toggleTagFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await toggleCardAttributeTool.execute({
				card_number: 42,
				attribute: "tag",
				operation: "add",
				tag_title: "bug",
			});

			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("add");
			expect(parsed.attribute).toBe("tag");
			expect(parsed.card).toBeDefined();
			expect(parsed.card.id).toBe("card_1");
			expect(parsed.card.number).toBe(42);
			expect(parsed.card.title).toBe("Fix authentication bug");
			expect(parsed.card.tags).toHaveLength(1);
			expect(parsed.card.assignees).toHaveLength(1);
		});

		test("card reflects post-toggle state", async () => {
			const cardWithNewTag = {
				...mockCard,
				tags: [
					{ id: "tag_1", title: "bug", color: "red" },
					{ id: "tag_2", title: "feature", color: "blue" },
				],
			};
			const getCardFn = vi
				.fn()
				.mockResolvedValueOnce(ok(mockCard))
				.mockResolvedValueOnce(ok(cardWithNewTag));
			const toggleTagFn = vi.fn().mockResolvedValue(ok(undefined));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: toggleTagFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await toggleCardAttributeTool.execute({
				card_number: 42,
				attribute: "tag",
				operation: "add",
				tag_title: "feature",
			});

			const parsed = JSON.parse(result);
			expect(parsed.card.tags).toHaveLength(2);
			expect(parsed.card.tags.map((t: { title: string }) => t.title)).toContain(
				"feature",
			);
		});
	});

	describe("error handling", () => {
		test("throws UserError on card not found", async () => {
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 999,
					attribute: "tag",
					operation: "add",
					tag_title: "bug",
				}),
			).rejects.toThrow("[NOT_FOUND] Card #999");
		});

		test("throws UserError on toggle API error", async () => {
			const getCardFn = vi.fn().mockResolvedValue(ok(mockCardNoTags));
			const toggleTagFn = vi.fn().mockResolvedValue(err(new NotFoundError()));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				getCard: getCardFn,
				toggleTag: toggleTagFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			await expect(
				toggleCardAttributeTool.execute({
					card_number: 42,
					attribute: "tag",
					operation: "add",
					tag_title: "bug",
				}),
			).rejects.toThrow("[NOT_FOUND] Tag bug");
		});
	});
});
