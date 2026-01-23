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

		test("should return all boards across pages", async () => {
			const client = new FizzyClient();
			const result = await client.listBoards("897362094");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value).toHaveLength(2);
				expect(result.value[0]?.name).toBe("Project Alpha");
				expect(result.value[1]?.name).toBe("Project Beta");
			}
		});

		test("should handle empty board list", async () => {
			const client = new FizzyClient();
			const result = await client.listBoards("empty-account");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value).toHaveLength(0);
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

		test("should return all tags across pages", async () => {
			const client = new FizzyClient();
			const result = await client.listTags("897362094");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value).toHaveLength(3);
				expect(result.value[0]?.title).toBe("Bug");
				expect(result.value[1]?.title).toBe("Feature");
				expect(result.value[2]?.title).toBe("Documentation");
			}
		});

		test("should handle empty tag list", async () => {
			const client = new FizzyClient();
			const result = await client.listTags("empty-account");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value).toHaveLength(0);
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

		test("should return all columns across pages", async () => {
			const client = new FizzyClient();
			const result = await client.listColumns("897362094", "board_1");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value).toHaveLength(3);
				expect(result.value[0]?.name).toBe("Backlog");
				expect(result.value[1]?.name).toBe("In Progress");
				expect(result.value[2]?.name).toBe("Done");
			}
		});

		test("should handle empty column list", async () => {
			const client = new FizzyClient();
			const result = await client.listColumns("empty-account", "board_1");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value).toHaveLength(0);
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
			const result = await client.updateColumn("897362094", "board_1", "col_1", {
				name: "Updated Name",
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.name).toBe("Updated Name");
			}
		});

		test("should update column color", async () => {
			const client = new FizzyClient();
			const result = await client.updateColumn("897362094", "board_1", "col_1", {
				color: "#0000FF",
			});

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
});
