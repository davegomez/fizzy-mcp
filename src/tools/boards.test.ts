import { HttpResponse, http } from "msw";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { ENV_TOKEN } from "../config.js";
import { clearResolverCache } from "../state/account-resolver.js";
import { clearSession, setSession } from "../state/session.js";
import { server } from "../test/mocks/server.js";
import { boardsTool } from "./boards.js";

const BASE_URL = "https://app.fizzy.do";

function setTestAccount(slug: string): void {
	setSession({
		account: { slug, name: "Test Account", id: "acc_test" },
		user: { id: "user_test", name: "Test User", role: "member" },
	});
}

const mockCreator = {
	id: "user_1",
	name: "Jane Doe",
	role: "owner" as const,
	active: true,
	email_address: "jane@example.com",
	created_at: "2024-01-01T00:00:00Z",
	url: "https://app.fizzy.do/users/user_1",
};

const mockBoard = {
	id: "board_1",
	name: "Project Alpha",
	all_access: true,
	creator: mockCreator,
	created_at: "2024-01-01T00:00:00Z",
	url: "https://app.fizzy.do/897362094/boards/board_1",
};

const mockColumns = [
	{
		id: "col_1",
		name: "Backlog",
		color: { name: "gray", value: "#808080" },
		created_at: "2024-01-01T00:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_1/columns/col_1",
	},
	{
		id: "col_2",
		name: "Done",
		color: { name: "green", value: "#00ff00" },
		created_at: "2024-01-01T00:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_1/columns/col_2",
	},
];

describe("boardsTool", () => {
	beforeAll(() => {
		server.listen({ onUnhandledRequest: "error" });
	});

	afterAll(() => {
		server.close();
	});

	beforeEach(() => {
		clearSession();
		clearResolverCache();
		process.env[ENV_TOKEN] = "test-token";
	});

	afterEach(() => {
		server.resetHandlers();
	});

	test("should resolve account from args", async () => {
		server.use(
			http.get(`${BASE_URL}/my-account/boards`, () => {
				return HttpResponse.json([mockBoard]);
			}),
			http.get(`${BASE_URL}/my-account/boards/board_1/columns`, () => {
				return HttpResponse.json(mockColumns);
			}),
		);

		const result = await boardsTool.execute({
			account_slug: "my-account",
			limit: 25,
		});
		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].name).toBe("Project Alpha");
	});

	test("should resolve account from default when not provided", async () => {
		setTestAccount("default-account");

		server.use(
			http.get(`${BASE_URL}/default-account/boards`, () => {
				return HttpResponse.json([]);
			}),
		);

		const result = await boardsTool.execute({ limit: 25 });
		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(0);
	});

	test("should throw when no account and no default set", async () => {
		server.use(
			http.get(`${BASE_URL}/my/identity`, () => {
				return HttpResponse.json({}, { status: 401 });
			}),
		);

		await expect(boardsTool.execute({ limit: 25 })).rejects.toThrow(
			/No account specified/,
		);
	});

	test("should strip leading slash from account slug", async () => {
		server.use(
			http.get(`${BASE_URL}/897362094/boards`, () => {
				return HttpResponse.json([]);
			}),
		);

		const result = await boardsTool.execute({
			account_slug: "/897362094",
			limit: 25,
		});
		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(0);
	});

	test("should return JSON with paginated board list including columns", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/boards`, () => {
				return HttpResponse.json([mockBoard]);
			}),
			http.get(`${BASE_URL}/897362094/boards/board_1/columns`, () => {
				return HttpResponse.json(mockColumns);
			}),
		);

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
		setTestAccount("897362094");

		let columnsRequestUrl: string | undefined;
		server.use(
			http.get(`${BASE_URL}/897362094/boards`, () => {
				return HttpResponse.json([mockBoard]);
			}),
			http.get(
				`${BASE_URL}/897362094/boards/board_1/columns`,
				({ request }) => {
					columnsRequestUrl = request.url;
					return HttpResponse.json(mockColumns);
				},
			),
		);

		await boardsTool.execute({ limit: 25 });

		expect(columnsRequestUrl).toContain("/897362094/boards/board_1/columns");
	});

	test("should hydrate columns correctly for multiple boards in parallel", async () => {
		setTestAccount("897362094");

		const board2 = { ...mockBoard, id: "board_2", name: "Project Beta" };
		const board2Columns = [
			{
				id: "col_3",
				name: "Todo",
				color: { name: "blue", value: "#0000ff" },
				created_at: "2024-01-01T00:00:00Z",
				url: "https://app.fizzy.do/897362094/boards/board_2/columns/col_3",
			},
		];

		server.use(
			http.get(`${BASE_URL}/897362094/boards`, () => {
				return HttpResponse.json([mockBoard, board2]);
			}),
			http.get(
				`${BASE_URL}/897362094/boards/:boardId/columns`,
				({ params }) => {
					if (params.boardId === "board_1") {
						return HttpResponse.json(mockColumns);
					}
					if (params.boardId === "board_2") {
						return HttpResponse.json(board2Columns);
					}
					return HttpResponse.json([]);
				},
			),
		);

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
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/boards`, () => {
				return HttpResponse.json([mockBoard]);
			}),
			http.get(`${BASE_URL}/897362094/boards/board_1/columns`, () => {
				return HttpResponse.json(mockColumns);
			}),
		);

		const result = await boardsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		const column = parsed.items[0].columns[0];
		expect(column).toEqual({
			id: "col_1",
			name: "Backlog",
			color: { name: "gray", value: "#808080" },
		});
		expect(column.created_at).toBeUndefined();
		expect(column.url).toBeUndefined();
	});

	test("should gracefully handle column fetch failure with empty array", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/boards`, () => {
				return HttpResponse.json([mockBoard]);
			}),
			http.get(`${BASE_URL}/897362094/boards/board_1/columns`, () => {
				return HttpResponse.json({}, { status: 404 });
			}),
		);

		const result = await boardsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(1);
		expect(parsed.items[0].columns).toEqual([]);
	});

	test("should return empty items array when no boards found", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/boards`, () => {
				return HttpResponse.json([]);
			}),
		);

		const result = await boardsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(0);
		expect(parsed.pagination.returned).toBe(0);
	});

	test("should paginate with cursor continuation", async () => {
		setTestAccount("897362094");

		const board2 = { ...mockBoard, id: "board_2", name: "Project Beta" };

		server.use(
			http.get(`${BASE_URL}/897362094/boards`, ({ request }) => {
				const url = new URL(request.url);
				const page = Number.parseInt(url.searchParams.get("page") || "1", 10);

				if (page === 1) {
					return HttpResponse.json([mockBoard], {
						headers: {
							Link: `<${BASE_URL}/897362094/boards?page=2>; rel="next"`,
						},
					});
				}

				return HttpResponse.json([board2]);
			}),
			http.get(`${BASE_URL}/897362094/boards/:boardId/columns`, () => {
				return HttpResponse.json([]);
			}),
		);

		// Page 1: has_more=true with cursor
		const page1 = JSON.parse(await boardsTool.execute({ limit: 25 }));
		expect(page1.items).toHaveLength(1);
		expect(page1.items[0].name).toBe("Project Alpha");
		expect(page1.pagination.has_more).toBe(true);
		expect(page1.pagination.next_cursor).toBeDefined();

		// Page 2: use cursor, has_more=false
		const page2 = JSON.parse(
			await boardsTool.execute({
				limit: 25,
				cursor: page1.pagination.next_cursor,
			}),
		);
		expect(page2.items).toHaveLength(1);
		expect(page2.items[0].name).toBe("Project Beta");
		expect(page2.pagination.has_more).toBe(false);
		expect(page2.pagination.next_cursor).toBeUndefined();
	});

	test("should throw UserError on API error", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/boards`, () => {
				return HttpResponse.json({}, { status: 401 });
			}),
		);

		await expect(boardsTool.execute({ limit: 25 })).rejects.toThrow(
			"Authentication failed",
		);
	});
});
