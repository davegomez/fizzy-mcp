import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError, NotFoundError } from "../client/errors.js";
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
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-15T00:00:00Z",
	url: "https://app.fizzy.do/897362094/boards/board_1",
};

const mockColumns = [
	{
		id: "col_1",
		name: "Backlog",
		color: "gray",
		cards_count: 5,
		position: 0,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-01T00:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_1/columns/col_1",
	},
	{
		id: "col_2",
		name: "Done",
		color: "green",
		cards_count: 10,
		position: 1,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-01T00:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_1/columns/col_2",
	},
];

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

	const mockColumnsResult = {
		items: mockColumns,
		pagination: { returned: 2, has_more: false },
	};

	test("should resolve account from args", async () => {
		const listBoardsFn = vi.fn().mockResolvedValue(ok(mockPaginatedResult));
		const listColumnsFn = vi.fn().mockResolvedValue(ok(mockColumnsResult));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: listBoardsFn,
			listColumns: listColumnsFn,
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
		const listColumnsFn = vi.fn().mockResolvedValue(ok(mockColumnsResult));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: listBoardsFn,
			listColumns: listColumnsFn,
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
		const listColumnsFn = vi.fn().mockResolvedValue(ok(mockColumnsResult));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: listBoardsFn,
			listColumns: listColumnsFn,
		} as unknown as client.FizzyClient);

		await boardsTool.execute({ account_slug: "/897362094", limit: 25 });
		expect(listBoardsFn).toHaveBeenCalledWith("897362094", {
			limit: 25,
			cursor: undefined,
		});
	});

	test("should return JSON with paginated board list including columns", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi.fn().mockResolvedValue(ok(mockPaginatedResult)),
			listColumns: vi.fn().mockResolvedValue(ok(mockColumnsResult)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await boardsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].name).toBe("Project Alpha");
		expect(parsed.items[0].columns).toHaveLength(2);
		expect(parsed.items[0].columns[0].name).toBe("Backlog");
		expect(parsed.pagination.returned).toBe(1);
		expect(parsed.pagination.has_more).toBe(false);
	});

	test("should hydrate columns from listColumns for each board", async () => {
		const listColumnsFn = vi.fn().mockResolvedValue(ok(mockColumnsResult));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi.fn().mockResolvedValue(ok(mockPaginatedResult)),
			listColumns: listColumnsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await boardsTool.execute({ limit: 25 });

		expect(listColumnsFn).toHaveBeenCalledWith("897362094", "board_1");
	});

	test("should hydrate columns correctly for multiple boards in parallel", async () => {
		const board2 = { ...mockBoard, id: "board_2", name: "Project Beta" };
		const board2Columns = [
			{
				id: "col_3",
				name: "Todo",
				color: "blue",
				cards_count: 3,
				position: 0,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
				url: "https://app.fizzy.do/897362094/boards/board_2/columns/col_3",
			},
		];

		const listColumnsFn = vi.fn().mockImplementation((_account, boardId) => {
			if (boardId === "board_1") return Promise.resolve(ok(mockColumnsResult));
			if (boardId === "board_2")
				return Promise.resolve(
					ok({
						items: board2Columns,
						pagination: { returned: 1, has_more: false },
					}),
				);
			return Promise.resolve(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		});

		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi.fn().mockResolvedValue(
				ok({
					items: [mockBoard, board2],
					pagination: { returned: 2, has_more: false },
				}),
			),
			listColumns: listColumnsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await boardsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(2);
		expect(parsed.items[0].id).toBe("board_1");
		expect(parsed.items[0].columns).toHaveLength(2);
		expect(parsed.items[0].columns[0].name).toBe("Backlog");
		expect(parsed.items[1].id).toBe("board_2");
		expect(parsed.items[1].columns).toHaveLength(1);
		expect(parsed.items[1].columns[0].name).toBe("Todo");
	});

	test("should strip extra fields from columns to produce ColumnSummary", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi.fn().mockResolvedValue(ok(mockPaginatedResult)),
			listColumns: vi.fn().mockResolvedValue(ok(mockColumnsResult)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await boardsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		const column = parsed.items[0].columns[0];
		expect(column).toEqual({
			id: "col_1",
			name: "Backlog",
			color: "gray",
			cards_count: 5,
			position: 0,
		});
		expect(column.created_at).toBeUndefined();
		expect(column.updated_at).toBeUndefined();
		expect(column.url).toBeUndefined();
	});

	test("should gracefully handle column fetch failure with empty array", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi.fn().mockResolvedValue(ok(mockPaginatedResult)),
			listColumns: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await boardsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].columns).toEqual([]);
	});

	test("should return empty items array when no boards found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listBoards: vi
				.fn()
				.mockResolvedValue(
					ok({ items: [], pagination: { returned: 0, has_more: false } }),
				),
			listColumns: vi.fn().mockResolvedValue(ok(mockColumnsResult)),
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
			listColumns: vi.fn().mockResolvedValue(ok(mockColumnsResult)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(boardsTool.execute({ limit: 25 })).rejects.toThrow(
			"Authentication failed",
		);
	});
});
