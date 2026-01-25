import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError } from "../client/errors.js";
import * as client from "../client/index.js";
import { ENV_TOKEN } from "../config.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { boardsTool } from "./boards.js";

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

describe("boardsTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env[ENV_TOKEN] = "test-token";
	});

	const mockPaginatedResult = {
		items: [mockBoard],
		pagination: { returned: 1, has_more: false },
	};

	test("should resolve account from args", async () => {
		const listBoardsFn = vi.fn().mockResolvedValue(ok(mockPaginatedResult));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: listBoardsFn,
		} as unknown as client.FizzyClient);

		await boardsTool.execute({ account_slug: "my-account", limit: 25 });
		expect(listBoardsFn).toHaveBeenCalledWith("my-account", {
			limit: 25,
			cursor: undefined,
		});
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const listBoardsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: listBoardsFn,
		} as unknown as client.FizzyClient);

		await boardsTool.execute({ limit: 25 });
		expect(listBoardsFn).toHaveBeenCalledWith("default-account", {
			limit: 25,
			cursor: undefined,
		});
	});

	test("should throw when no account and no default set", async () => {
		await expect(boardsTool.execute({ limit: 25 })).rejects.toThrow(
			"No account specified and no default set",
		);
	});

	test("should strip leading slash from account slug", async () => {
		const listBoardsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: listBoardsFn,
		} as unknown as client.FizzyClient);

		await boardsTool.execute({ account_slug: "/897362094", limit: 25 });
		expect(listBoardsFn).toHaveBeenCalledWith("897362094", {
			limit: 25,
			cursor: undefined,
		});
	});

	test("should return JSON with paginated board list", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi.fn().mockResolvedValue(ok(mockPaginatedResult)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await boardsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].name).toBe("Project Alpha");
		expect(parsed.pagination.returned).toBe(1);
		expect(parsed.pagination.has_more).toBe(false);
	});

	test("should return empty items array when no boards found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi
				.fn()
				.mockResolvedValue(
					ok({ items: [], pagination: { returned: 0, has_more: false } }),
				),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await boardsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(0);
		expect(parsed.pagination.returned).toBe(0);
	});

	test("should throw UserError on API error", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi.fn().mockResolvedValue(err(new AuthenticationError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(boardsTool.execute({ limit: 25 })).rejects.toThrow(
			"Authentication failed",
		);
	});
});
