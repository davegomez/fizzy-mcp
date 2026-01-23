import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError, NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import {
	createBoardTool,
	getBoardTool,
	listBoardsTool,
	updateBoardTool,
} from "./boards.js";

const mockBoard = {
	id: "board_1",
	name: "Project Alpha",
	slug: "project-alpha",
	description: "<p>Main project board</p>",
	columns: [
		{
			id: "col_1",
			name: "Backlog",
			color: "gray",
			cards_count: 5,
			position: 0,
		},
		{ id: "col_2", name: "Done", color: "green", cards_count: 10, position: 1 },
	],
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-15T00:00:00Z",
	url: "https://app.fizzy.do/897362094/boards/board_1",
};

describe("listBoardsTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const listBoardsFn = vi.fn().mockResolvedValue(ok([mockBoard]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: listBoardsFn,
		} as unknown as client.FizzyClient);

		await listBoardsTool.execute({ account_slug: "my-account" });
		expect(listBoardsFn).toHaveBeenCalledWith("my-account");
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const listBoardsFn = vi.fn().mockResolvedValue(ok([]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: listBoardsFn,
		} as unknown as client.FizzyClient);

		await listBoardsTool.execute({});
		expect(listBoardsFn).toHaveBeenCalledWith("default-account");
	});

	test("should throw when no account and no default set", async () => {
		await expect(listBoardsTool.execute({})).rejects.toThrow(
			"No account specified and no default set",
		);
	});

	test("should strip leading slash from account slug", async () => {
		const listBoardsFn = vi.fn().mockResolvedValue(ok([]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: listBoardsFn,
		} as unknown as client.FizzyClient);

		await listBoardsTool.execute({ account_slug: "/897362094" });
		expect(listBoardsFn).toHaveBeenCalledWith("897362094");
	});

	test("should return formatted board list with column breakdown", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi.fn().mockResolvedValue(ok([mockBoard])),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listBoardsTool.execute({});

		expect(result).toContain("Project Alpha");
		expect(result).toContain("Backlog: 5 cards");
		expect(result).toContain("Done: 10 cards");
	});

	test("should return message when no boards found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi.fn().mockResolvedValue(ok([])),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listBoardsTool.execute({});

		expect(result).toBe("No boards found.");
	});

	test("should throw UserError on API error", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi.fn().mockResolvedValue(err(new AuthenticationError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(listBoardsTool.execute({})).rejects.toThrow(
			"Authentication failed",
		);
	});
});

describe("getBoardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const getBoardFn = vi.fn().mockResolvedValue(ok(mockBoard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getBoard: getBoardFn,
		} as unknown as client.FizzyClient);

		await getBoardTool.execute({
			account_slug: "my-account",
			board_id: "board_1",
		});
		expect(getBoardFn).toHaveBeenCalledWith("my-account", "board_1");
	});

	test("should throw when no account and no default set", async () => {
		await expect(getBoardTool.execute({ board_id: "board_1" })).rejects.toThrow(
			"No account specified and no default set",
		);
	});

	test("should return JSON with markdown description", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getBoard: vi.fn().mockResolvedValue(ok(mockBoard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await getBoardTool.execute({ board_id: "board_1" });

		const parsed = JSON.parse(result);
		expect(parsed.name).toBe("Project Alpha");
		expect(parsed.description).toBe("Main project board");
		expect(parsed.columns).toHaveLength(2);
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getBoard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			getBoardTool.execute({ board_id: "nonexistent" }),
		).rejects.toThrow("Resource not found");
	});
});

describe("createBoardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const createBoardFn = vi.fn().mockResolvedValue(ok(mockBoard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createBoard: createBoardFn,
		} as unknown as client.FizzyClient);

		await createBoardTool.execute({
			account_slug: "my-account",
			name: "New Board",
		});
		expect(createBoardFn).toHaveBeenCalledWith("my-account", {
			name: "New Board",
			description: undefined,
		});
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			createBoardTool.execute({ name: "New Board" }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should pass description to client", async () => {
		const createBoardFn = vi.fn().mockResolvedValue(ok(mockBoard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createBoard: createBoardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await createBoardTool.execute({
			name: "New Board",
			description: "# Heading",
		});
		expect(createBoardFn).toHaveBeenCalledWith("897362094", {
			name: "New Board",
			description: "# Heading",
		});
	});

	test("should return created board details", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createBoard: vi.fn().mockResolvedValue(ok(mockBoard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await createBoardTool.execute({ name: "New Board" });

		const parsed = JSON.parse(result);
		expect(parsed.name).toBe("Project Alpha");
		expect(parsed.id).toBe("board_1");
	});
});

describe("updateBoardTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const updateBoardFn = vi.fn().mockResolvedValue(ok(mockBoard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateBoard: updateBoardFn,
		} as unknown as client.FizzyClient);

		await updateBoardTool.execute({
			account_slug: "my-account",
			board_id: "board_1",
			name: "Updated Name",
		});
		expect(updateBoardFn).toHaveBeenCalledWith("my-account", "board_1", {
			name: "Updated Name",
			description: undefined,
		});
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			updateBoardTool.execute({ board_id: "board_1", name: "Updated" }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should pass both name and description to client", async () => {
		const updateBoardFn = vi.fn().mockResolvedValue(ok(mockBoard));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateBoard: updateBoardFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await updateBoardTool.execute({
			board_id: "board_1",
			name: "New Name",
			description: "New desc",
		});
		expect(updateBoardFn).toHaveBeenCalledWith("897362094", "board_1", {
			name: "New Name",
			description: "New desc",
		});
	});

	test("should return updated board details", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateBoard: vi.fn().mockResolvedValue(ok(mockBoard)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await updateBoardTool.execute({
			board_id: "board_1",
			name: "Updated",
		});

		const parsed = JSON.parse(result);
		expect(parsed.name).toBe("Project Alpha");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateBoard: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			updateBoardTool.execute({ board_id: "nonexistent", name: "Test" }),
		).rejects.toThrow("Resource not found");
	});
});
