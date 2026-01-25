import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { isErr, isOk } from "../types/result.js";
import {
	AuthenticationError,
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	ValidationError,
} from "./errors.js";
import { FizzyClient, getFizzyClient, resetClient } from "./fizzy.js";

describe("FizzyClient", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
		resetClient();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("constructor", () => {
		test("should throw when FIZZY_ACCESS_TOKEN is missing", () => {
			delete process.env.FIZZY_ACCESS_TOKEN;
			expect(() => new FizzyClient()).toThrow("FIZZY_ACCESS_TOKEN");
		});

		test("should use default base URL when FIZZY_BASE_URL not set", () => {
			process.env.FIZZY_ACCESS_TOKEN = "test-token";
			const client = new FizzyClient();
			expect(client.baseUrl).toBe("https://app.fizzy.do");
		});

		test("should use custom base URL from environment", () => {
			process.env.FIZZY_ACCESS_TOKEN = "test-token";
			process.env.FIZZY_BASE_URL = "https://custom.fizzy.do";
			const client = new FizzyClient();
			expect(client.baseUrl).toBe("https://custom.fizzy.do");
		});
	});

	describe("whoami", () => {
		test("should return identity on success", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
			const client = new FizzyClient();
			const result = await client.whoami();

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.accounts).toHaveLength(1);
				expect(result.value.accounts[0]?.slug).toBe("897362094");
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.whoami();

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("error handling", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return ForbiddenError on 403", async () => {
			const client = new FizzyClient();
			const result = await client.request("GET", "/forbidden");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ForbiddenError);
			}
		});

		test("should return NotFoundError on 404", async () => {
			const client = new FizzyClient();
			const result = await client.request("GET", "/not-found");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return ValidationError on 422 with details", async () => {
			const client = new FizzyClient();
			const result = await client.request("POST", "/validation-error");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
				expect(result.error.details).toEqual({ name: ["is required"] });
			}
		});

		test("should return RateLimitError on 429", async () => {
			const client = new FizzyClient();
			const result = await client.request("GET", "/rate-limited");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(RateLimitError);
			}
		});

		test("should handle 204 No Content", async () => {
			const client = new FizzyClient();
			const result = await client.request("DELETE", "/no-content");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.data).toBeUndefined();
			}
		});
	});

	describe("getFizzyClient", () => {
		test("should return singleton instance", () => {
			process.env.FIZZY_ACCESS_TOKEN = "test-token";
			const client1 = getFizzyClient();
			const client2 = getFizzyClient();
			expect(client1).toBe(client2);
		});
	});

	describe("listBoards", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return paginated boards with first page", async () => {
			const client = new FizzyClient();
			const result = await client.listBoards("897362094");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// MSW handler returns 1 board per page, so first page has 1 item
				expect(result.value.items).toHaveLength(1);
				expect(result.value.items[0]?.name).toBe("Project Alpha");
				expect(result.value.pagination.returned).toBe(1);
				expect(typeof result.value.pagination.has_more).toBe("boolean");
			}
		});

		test("should return has_more true when Link header has next", async () => {
			const client = new FizzyClient();
			const result = await client.listBoards("897362094");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.pagination.has_more).toBe(true);
				expect(result.value.pagination.next_cursor).toBeDefined();
			}
		});

		test("should return has_more false when no Link header", async () => {
			const client = new FizzyClient();
			const result = await client.listBoards("empty-account");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.pagination.has_more).toBe(false);
				expect(result.value.pagination.next_cursor).toBeUndefined();
			}
		});

		test("should return ValidationError for invalid cursor", async () => {
			const client = new FizzyClient();
			const result = await client.listBoards("897362094", {
				cursor: "not-valid-base64!!!",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
			}
		});

		test("should handle empty board list", async () => {
			const client = new FizzyClient();
			const result = await client.listBoards("empty-account");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.items).toHaveLength(0);
				expect(result.value.pagination.returned).toBe(0);
				expect(result.value.pagination.has_more).toBe(false);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.listBoards("897362094");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("getBoard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return board details", async () => {
			const client = new FizzyClient();
			const result = await client.getBoard("897362094", "board_1");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.name).toBe("Project Alpha");
				expect(result.value.columns).toHaveLength(3);
				expect(result.value.columns[0]?.name).toBe("Backlog");
			}
		});

		test("should return NotFoundError for missing board", async () => {
			const client = new FizzyClient();
			const result = await client.getBoard("897362094", "nonexistent");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.getBoard("897362094", "board_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("createBoard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should create board with name only", async () => {
			const client = new FizzyClient();
			const result = await client.createBoard("897362094", {
				name: "New Board",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.name).toBe("New Board");
				expect(result.value.id).toBe("board_new");
			}
		});

		test("should create board with name and description (converts markdown)", async () => {
			const client = new FizzyClient();
			const result = await client.createBoard("897362094", {
				name: "New Board",
				description: "# Heading\n\nSome **bold** text",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.name).toBe("New Board");
				// Description is converted to HTML by client before sending
				expect(result.value.description).toContain("<h1>");
			}
		});

		test("should return ValidationError on 422", async () => {
			const client = new FizzyClient();
			const result = await client.createBoard("897362094", {
				name: "",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
			}
		});
	});

	describe("updateBoard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should update board name", async () => {
			const client = new FizzyClient();
			const result = await client.updateBoard("897362094", "board_1", {
				name: "Updated Name",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.name).toBe("Updated Name");
			}
		});

		test("should update board description (converts markdown)", async () => {
			const client = new FizzyClient();
			const result = await client.updateBoard("897362094", "board_1", {
				description: "## New Description\n\n- item 1\n- item 2",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.description).toContain("<h2>");
			}
		});

		test("should return NotFoundError for missing board", async () => {
			const client = new FizzyClient();
			const result = await client.updateBoard("897362094", "nonexistent", {
				name: "Test",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});
	});

	describe("listTags", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return paginated tags with first page", async () => {
			const client = new FizzyClient();
			const result = await client.listTags("897362094");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// MSW handler returns 2 tags per page
				expect(result.value.items).toHaveLength(2);
				expect(result.value.items[0]?.title).toBe("Bug");
				expect(result.value.items[1]?.title).toBe("Feature");
				expect(result.value.pagination.returned).toBe(2);
				expect(result.value.pagination.has_more).toBe(true);
			}
		});

		test("should handle empty tag list", async () => {
			const client = new FizzyClient();
			const result = await client.listTags("empty-account");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.items).toHaveLength(0);
				expect(result.value.pagination.returned).toBe(0);
				expect(result.value.pagination.has_more).toBe(false);
			}
		});

		test("should return ValidationError for invalid cursor", async () => {
			const client = new FizzyClient();
			const result = await client.listTags("897362094", {
				cursor: "!!!invalid",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.listTags("897362094");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("listColumns", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return paginated columns with first page", async () => {
			const client = new FizzyClient();
			const result = await client.listColumns("897362094", "board_1");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// MSW handler returns 2 columns per page
				expect(result.value.items).toHaveLength(2);
				expect(result.value.items[0]?.name).toBe("Backlog");
				expect(result.value.items[1]?.name).toBe("In Progress");
				expect(result.value.pagination.returned).toBe(2);
				expect(result.value.pagination.has_more).toBe(true);
			}
		});

		test("should handle empty column list", async () => {
			const client = new FizzyClient();
			const result = await client.listColumns("empty-account", "board_1");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.items).toHaveLength(0);
				expect(result.value.pagination.returned).toBe(0);
				expect(result.value.pagination.has_more).toBe(false);
			}
		});

		test("should return ValidationError for invalid cursor", async () => {
			const client = new FizzyClient();
			const result = await client.listColumns("897362094", "board_1", {
				cursor: "bad-cursor",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.listColumns("897362094", "board_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("getColumn", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return column details", async () => {
			const client = new FizzyClient();
			const result = await client.getColumn("897362094", "board_1", "col_1");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.name).toBe("Backlog");
				expect(result.value.color).toBe("#808080");
				expect(result.value.position).toBe(0);
				expect(result.value.cards_count).toBe(5);
			}
		});

		test("should return NotFoundError for missing column", async () => {
			const client = new FizzyClient();
			const result = await client.getColumn(
				"897362094",
				"board_1",
				"nonexistent",
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.getColumn("897362094", "board_1", "col_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("createColumn", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should create column with name only", async () => {
			const client = new FizzyClient();
			const result = await client.createColumn("897362094", "board_1", {
				name: "New Column",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.name).toBe("New Column");
				expect(result.value.id).toBe("col_new");
			}
		});

		test("should create column with name and color", async () => {
			const client = new FizzyClient();
			const result = await client.createColumn("897362094", "board_1", {
				name: "New Column",
				color: "#FF0000",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.name).toBe("New Column");
				expect(result.value.color).toBe("#FF0000");
			}
		});

		test("should return ValidationError on 422", async () => {
			const client = new FizzyClient();
			const result = await client.createColumn("897362094", "board_1", {
				name: "",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
			}
		});
	});

	describe("updateColumn", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should update column name", async () => {
			const client = new FizzyClient();
			const result = await client.updateColumn(
				"897362094",
				"board_1",
				"col_1",
				{
					name: "Updated Name",
				},
			);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.name).toBe("Updated Name");
			}
		});

		test("should update column color", async () => {
			const client = new FizzyClient();
			const result = await client.updateColumn(
				"897362094",
				"board_1",
				"col_1",
				{
					color: "#0000FF",
				},
			);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.color).toBe("#0000FF");
			}
		});

		test("should return NotFoundError for missing column", async () => {
			const client = new FizzyClient();
			const result = await client.updateColumn(
				"897362094",
				"board_1",
				"nonexistent",
				{ name: "Test" },
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});
	});

	describe("deleteColumn", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should delete column", async () => {
			const client = new FizzyClient();
			const result = await client.deleteColumn("897362094", "board_1", "col_1");

			expect(isOk(result)).toBe(true);
		});

		test("should return NotFoundError for missing column", async () => {
			const client = new FizzyClient();
			const result = await client.deleteColumn(
				"897362094",
				"board_1",
				"nonexistent",
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.deleteColumn("897362094", "board_1", "col_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("listCards", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return paginated cards with first page", async () => {
			const client = new FizzyClient();
			const result = await client.listCards("897362094");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// MSW handler returns 2 cards per page
				expect(result.value.items).toHaveLength(2);
				expect(result.value.items[0]?.title).toBe("Fix login bug");
				expect(result.value.items[1]?.title).toBe("Add dark mode");
				expect(result.value.pagination.returned).toBe(2);
				expect(result.value.pagination.has_more).toBe(true);
			}
		});

		test("should handle empty card list", async () => {
			const client = new FizzyClient();
			const result = await client.listCards("empty-account");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.items).toHaveLength(0);
				expect(result.value.pagination.returned).toBe(0);
				expect(result.value.pagination.has_more).toBe(false);
			}
		});

		test("should filter by board_id", async () => {
			const client = new FizzyClient();
			const result = await client.listCards("897362094", {
				board_id: "board_1",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// Filters applied, pagination still works
				expect(result.value.items.length).toBeGreaterThan(0);
				expect(result.value.items.every((c) => c.board_id === "board_1")).toBe(
					true,
				);
			}
		});

		test("should filter by multiple tag_ids", async () => {
			const client = new FizzyClient();
			const result = await client.listCards("897362094", {
				tag_ids: ["tag_1", "tag_2"],
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.items.length).toBeGreaterThan(0);
			}
		});

		test("should filter by status", async () => {
			const client = new FizzyClient();
			const result = await client.listCards("897362094", { status: "closed" });

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.items.length).toBe(1);
				expect(result.value.items[0]?.status).toBe("closed");
			}
		});

		test("should return ValidationError for invalid cursor", async () => {
			const client = new FizzyClient();
			const result = await client.listCards(
				"897362094",
				{},
				{ cursor: "invalid!!!" },
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.listCards("897362094");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("getCard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return card by number", async () => {
			const client = new FizzyClient();
			const result = await client.getCard("897362094", 1);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.number).toBe(1);
				expect(result.value.title).toBe("Fix login bug");
				expect(result.value.tags).toHaveLength(1);
				expect(result.value.assignees).toHaveLength(1);
			}
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.getCard("897362094", 999);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.getCard("897362094", 1);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("getCardById", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return card by ID", async () => {
			const client = new FizzyClient();
			const result = await client.getCardById("897362094", "card_1");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.id).toBe("card_1");
				expect(result.value.number).toBe(1);
				expect(result.value.title).toBe("Fix login bug");
			}
		});

		test("should return NotFoundError for missing card ID", async () => {
			const client = new FizzyClient();
			const result = await client.getCardById("897362094", "nonexistent_id");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.getCardById("897362094", "card_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("createCard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should create card with title only", async () => {
			const client = new FizzyClient();
			const result = await client.createCard("897362094", "board_1", {
				title: "New Card",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.title).toBe("New Card");
				expect(result.value.id).toBe("card_new");
				expect(result.value.number).toBe(100);
				expect(result.value.column_id).toBeNull(); // Goes to inbox
			}
		});

		test("should create card with markdown description (converts to HTML)", async () => {
			const client = new FizzyClient();
			const result = await client.createCard("897362094", "board_1", {
				title: "New Card",
				description: "# Heading\n\nSome **bold** text",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// Description is converted to HTML by client before sending
				expect(result.value.description_html).toContain("<h1>");
				expect(result.value.description_html).toContain("<strong>");
			}
		});

		test("should return ValidationError on 422", async () => {
			const client = new FizzyClient();
			const result = await client.createCard("897362094", "board_1", {
				title: "",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.createCard("897362094", "board_1", {
				title: "Test",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("updateCard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should update card title", async () => {
			const client = new FizzyClient();
			const result = await client.updateCard("897362094", 1, {
				title: "Updated Title",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.title).toBe("Updated Title");
			}
		});

		test("should update card description (converts markdown to HTML)", async () => {
			const client = new FizzyClient();
			const result = await client.updateCard("897362094", 1, {
				description: "## New Description\n\n- item 1\n- item 2",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.description_html).toContain("<h2>");
				expect(result.value.description_html).toContain("<li>");
			}
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.updateCard("897362094", 999, {
				title: "Test",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.updateCard("897362094", 1, {
				title: "Test",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("deleteCard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should delete card", async () => {
			const client = new FizzyClient();
			const result = await client.deleteCard("897362094", 1);

			expect(isOk(result)).toBe(true);
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.deleteCard("897362094", 999);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.deleteCard("897362094", 1);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("closeCard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should close card", async () => {
			const client = new FizzyClient();
			const result = await client.closeCard("897362094", 1);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.status).toBe("closed");
				expect(result.value.closed_at).toBe("2024-03-15T00:00:00Z");
			}
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.closeCard("897362094", 999);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.closeCard("897362094", 1);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("reopenCard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should reopen card", async () => {
			const client = new FizzyClient();
			const result = await client.reopenCard("897362094", 3);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.status).toBe("open");
				expect(result.value.closed_at).toBeNull();
			}
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.reopenCard("897362094", 999);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.reopenCard("897362094", 3);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("triageCard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should triage card to column", async () => {
			const client = new FizzyClient();
			const result = await client.triageCard("897362094", 4, "col_1");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.column_id).toBe("col_1");
			}
		});

		test("should triage card with position", async () => {
			const client = new FizzyClient();
			const result = await client.triageCard("897362094", 4, "col_1", "top");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.column_id).toBe("col_1");
			}
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.triageCard("897362094", 999, "col_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.triageCard("897362094", 4, "col_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("unTriageCard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should untriage card back to inbox", async () => {
			const client = new FizzyClient();
			const result = await client.unTriageCard("897362094", 1);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.column_id).toBeNull();
			}
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.unTriageCard("897362094", 999);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.unTriageCard("897362094", 1);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("notNowCard", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should defer card", async () => {
			const client = new FizzyClient();
			const result = await client.notNowCard("897362094", 1);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.status).toBe("deferred");
			}
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.notNowCard("897362094", 999);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.notNowCard("897362094", 1);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("toggleTag", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should toggle tag on card", async () => {
			const client = new FizzyClient();
			const result = await client.toggleTag("897362094", 1, "Bug");

			expect(isOk(result)).toBe(true);
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.toggleTag("897362094", 999, "Bug");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.toggleTag("897362094", 1, "Bug");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("toggleAssignee", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should toggle assignee on card", async () => {
			const client = new FizzyClient();
			const result = await client.toggleAssignee("897362094", 1, "user_1");

			expect(isOk(result)).toBe(true);
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.toggleAssignee("897362094", 999, "user_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.toggleAssignee("897362094", 1, "user_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("createStep", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should create step with content", async () => {
			const client = new FizzyClient();
			const result = await client.createStep("897362094", 1, {
				content: "New step",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.content).toBe("New step");
				expect(result.value.completed).toBe(false);
				expect(result.value.id).toBe("step_new");
			}
		});

		test("should create step with completed flag", async () => {
			const client = new FizzyClient();
			const result = await client.createStep("897362094", 1, {
				content: "Completed step",
				completed: true,
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.completed).toBe(true);
			}
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.createStep("897362094", 999, {
				content: "Test",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return ValidationError on 422", async () => {
			const client = new FizzyClient();
			const result = await client.createStep("897362094", 1, {
				content: "",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.createStep("897362094", 1, {
				content: "Test",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("updateStep", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should update step content", async () => {
			const client = new FizzyClient();
			const result = await client.updateStep("897362094", 1, "step_1", {
				content: "Updated content",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.content).toBe("Updated content");
			}
		});

		test("should update step completed status", async () => {
			const client = new FizzyClient();
			const result = await client.updateStep("897362094", 1, "step_1", {
				completed: true,
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.completed).toBe(true);
			}
		});

		test("should return NotFoundError for missing step", async () => {
			const client = new FizzyClient();
			const result = await client.updateStep("897362094", 1, "nonexistent", {
				content: "Test",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.updateStep("897362094", 1, "step_1", {
				content: "Test",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("deleteStep", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should delete step", async () => {
			const client = new FizzyClient();
			const result = await client.deleteStep("897362094", 1, "step_1");

			expect(isOk(result)).toBe(true);
		});

		test("should return NotFoundError for missing step", async () => {
			const client = new FizzyClient();
			const result = await client.deleteStep("897362094", 1, "nonexistent");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.deleteStep("897362094", 1, "step_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("updateComment", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should update comment body (converts markdown to HTML)", async () => {
			const client = new FizzyClient();
			const result = await client.updateComment(
				"897362094",
				1,
				"comment_1",
				"## Updated content\n\n- item 1\n- item 2",
			);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.body.html).toContain("<h2>");
				expect(result.value.body.html).toContain("<li>");
			}
		});

		test("should return NotFoundError for missing comment", async () => {
			const client = new FizzyClient();
			const result = await client.updateComment(
				"897362094",
				1,
				"nonexistent",
				"Test",
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return ForbiddenError when not comment author", async () => {
			const client = new FizzyClient();
			const result = await client.updateComment(
				"897362094",
				1,
				"comment_other_user",
				"Test",
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ForbiddenError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.updateComment(
				"897362094",
				1,
				"comment_1",
				"Test",
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("listComments", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return paginated comments with first page", async () => {
			const client = new FizzyClient();
			const result = await client.listComments("897362094", 1);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// MSW handler returns 2 comments per page
				expect(result.value.items).toHaveLength(2);
				expect(result.value.pagination.returned).toBe(2);
				expect(result.value.pagination.has_more).toBe(true);
			}
		});

		test("should return comments in newest-first order on first page", async () => {
			const client = new FizzyClient();
			const result = await client.listComments("897362094", 1);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// First page is reversed for newest-first display
				// MSW returns comment_1, comment_2 (2 per page), reversed to comment_2, comment_1
				expect(result.value.items[0]?.id).toBe("comment_2");
				expect(result.value.items[1]?.id).toBe("comment_1");
			}
		});

		test("should handle empty comment list", async () => {
			const client = new FizzyClient();
			const result = await client.listComments("897362094", 4); // Card 4 has no comments

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.items).toHaveLength(0);
				expect(result.value.pagination.returned).toBe(0);
				expect(result.value.pagination.has_more).toBe(false);
			}
		});

		test("should return ValidationError for invalid cursor", async () => {
			const client = new FizzyClient();
			const result = await client.listComments("897362094", 1, {
				cursor: "@@invalid@@",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
			}
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.listComments("897362094", 999);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.listComments("897362094", 1);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("createComment", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should create comment with markdown body (converts to HTML)", async () => {
			const client = new FizzyClient();
			const result = await client.createComment(
				"897362094",
				1,
				"## Comment heading\n\nSome **bold** text",
			);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.id).toBe("comment_new");
				expect(result.value.body.html).toContain("<h2>");
				expect(result.value.body.html).toContain("<strong>");
			}
		});

		test("should return NotFoundError for missing card", async () => {
			const client = new FizzyClient();
			const result = await client.createComment(
				"897362094",
				999,
				"Test comment",
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.createComment("897362094", 1, "Test comment");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("updateComment", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should update comment body (converts markdown to HTML)", async () => {
			const client = new FizzyClient();
			const result = await client.updateComment(
				"897362094",
				1,
				"comment_1",
				"## Updated content\n\n- item 1\n- item 2",
			);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.body.html).toContain("<h2>");
				expect(result.value.body.html).toContain("<li>");
			}
		});

		test("should return NotFoundError for missing comment", async () => {
			const client = new FizzyClient();
			const result = await client.updateComment(
				"897362094",
				1,
				"nonexistent",
				"Test",
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return ForbiddenError when not comment author", async () => {
			const client = new FizzyClient();
			const result = await client.updateComment(
				"897362094",
				1,
				"comment_other_user",
				"Test",
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ForbiddenError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.updateComment(
				"897362094",
				1,
				"comment_1",
				"Test",
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("deleteComment", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should delete comment (returns 204 No Content)", async () => {
			const client = new FizzyClient();
			const result = await client.deleteComment("897362094", 1, "comment_1");

			expect(isOk(result)).toBe(true);
		});

		test("should return NotFoundError for missing comment", async () => {
			const client = new FizzyClient();
			const result = await client.deleteComment("897362094", 1, "nonexistent");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return ForbiddenError when not comment author", async () => {
			const client = new FizzyClient();
			const result = await client.deleteComment(
				"897362094",
				1,
				"comment_other_user",
			);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ForbiddenError);
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.deleteComment("897362094", 1, "comment_1");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("createDirectUpload", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should create direct upload with blob data", async () => {
			const client = new FizzyClient();
			const result = await client.createDirectUpload("897362094", {
				filename: "test.txt",
				byte_size: 100,
				checksum: "XrY7u+Ae7tCTyyK7j1rNww==",
				content_type: "text/plain",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.signed_id).toContain("signed_");
				expect(result.value.direct_upload.url).toBeDefined();
				expect(result.value.direct_upload.headers).toBeDefined();
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.createDirectUpload("897362094", {
				filename: "test.txt",
				byte_size: 100,
				checksum: "abc123",
				content_type: "text/plain",
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});
});
