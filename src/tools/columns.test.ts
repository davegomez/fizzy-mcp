import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError, NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import {
	createColumnTool,
	deleteColumnTool,
	getColumnTool,
	listColumnsTool,
	updateColumnTool,
} from "./columns.js";

const mockColumn = {
	id: "col_1",
	name: "Backlog",
	color: "#808080",
	position: 0,
	cards_count: 5,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-15T00:00:00Z",
	url: "https://app.fizzy.do/897362094/boards/board_1/columns/col_1",
};

describe("listColumnsTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const listColumnsFn = vi.fn().mockResolvedValue(ok([mockColumn]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listColumns: listColumnsFn,
		} as unknown as client.FizzyClient);

		await listColumnsTool.execute({
			account_slug: "my-account",
			board_id: "board_1",
		});
		expect(listColumnsFn).toHaveBeenCalledWith("my-account", "board_1");
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const listColumnsFn = vi.fn().mockResolvedValue(ok([]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listColumns: listColumnsFn,
		} as unknown as client.FizzyClient);

		await listColumnsTool.execute({ board_id: "board_1" });
		expect(listColumnsFn).toHaveBeenCalledWith("default-account", "board_1");
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			listColumnsTool.execute({ board_id: "board_1" }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should strip leading slash from account slug", async () => {
		const listColumnsFn = vi.fn().mockResolvedValue(ok([]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listColumns: listColumnsFn,
		} as unknown as client.FizzyClient);

		await listColumnsTool.execute({
			account_slug: "/897362094",
			board_id: "board_1",
		});
		expect(listColumnsFn).toHaveBeenCalledWith("897362094", "board_1");
	});

	test("should return formatted column list", async () => {
		const mockColumns = [
			{ ...mockColumn, name: "Backlog", cards_count: 5 },
			{ ...mockColumn, id: "col_2", name: "In Progress", cards_count: 3 },
		];
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listColumns: vi.fn().mockResolvedValue(ok(mockColumns)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listColumnsTool.execute({ board_id: "board_1" });

		expect(result).toContain("Backlog (#808080) - 5 cards");
		expect(result).toContain("In Progress (#808080) - 3 cards");
	});

	test("should return message when no columns found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listColumns: vi.fn().mockResolvedValue(ok([])),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listColumnsTool.execute({ board_id: "board_1" });

		expect(result).toBe("No columns found.");
	});

	test("should throw UserError on API error", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listColumns: vi.fn().mockResolvedValue(err(new AuthenticationError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			listColumnsTool.execute({ board_id: "board_1" }),
		).rejects.toThrow("Authentication failed");
	});
});

describe("getColumnTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const getColumnFn = vi.fn().mockResolvedValue(ok(mockColumn));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getColumn: getColumnFn,
		} as unknown as client.FizzyClient);

		await getColumnTool.execute({
			account_slug: "my-account",
			board_id: "board_1",
			column_id: "col_1",
		});
		expect(getColumnFn).toHaveBeenCalledWith("my-account", "board_1", "col_1");
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const getColumnFn = vi.fn().mockResolvedValue(ok(mockColumn));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getColumn: getColumnFn,
		} as unknown as client.FizzyClient);

		await getColumnTool.execute({ board_id: "board_1", column_id: "col_1" });
		expect(getColumnFn).toHaveBeenCalledWith(
			"default-account",
			"board_1",
			"col_1",
		);
	});

	test("should return column JSON", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getColumn: vi.fn().mockResolvedValue(ok(mockColumn)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await getColumnTool.execute({
			board_id: "board_1",
			column_id: "col_1",
		});

		const parsed = JSON.parse(result);
		expect(parsed.name).toBe("Backlog");
		expect(parsed.color).toBe("#808080");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			getColumn: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			getColumnTool.execute({ board_id: "board_1", column_id: "col_1" }),
		).rejects.toThrow("Resource not found");
	});
});

describe("createColumnTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should create column with name only", async () => {
		const createColumnFn = vi.fn().mockResolvedValue(ok(mockColumn));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createColumn: createColumnFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await createColumnTool.execute({
			board_id: "board_1",
			name: "New Column",
		});

		expect(createColumnFn).toHaveBeenCalledWith("897362094", "board_1", {
			name: "New Column",
			color: undefined,
		});
	});

	test("should create column with name and color", async () => {
		const createColumnFn = vi.fn().mockResolvedValue(ok(mockColumn));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createColumn: createColumnFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await createColumnTool.execute({
			board_id: "board_1",
			name: "New Column",
			color: "#FF0000",
		});

		expect(createColumnFn).toHaveBeenCalledWith("897362094", "board_1", {
			name: "New Column",
			color: "#FF0000",
		});
	});

	test("should return created column JSON", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createColumn: vi.fn().mockResolvedValue(ok(mockColumn)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await createColumnTool.execute({
			board_id: "board_1",
			name: "New Column",
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("col_1");
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			createColumnTool.execute({ board_id: "board_1", name: "New" }),
		).rejects.toThrow("No account specified and no default set");
	});
});

describe("updateColumnTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should update column name", async () => {
		const updateColumnFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockColumn, name: "Updated" }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateColumn: updateColumnFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await updateColumnTool.execute({
			board_id: "board_1",
			column_id: "col_1",
			name: "Updated",
		});

		expect(updateColumnFn).toHaveBeenCalledWith(
			"897362094",
			"board_1",
			"col_1",
			{
				name: "Updated",
				color: undefined,
			},
		);
	});

	test("should update column color", async () => {
		const updateColumnFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockColumn, color: "#FF0000" }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateColumn: updateColumnFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await updateColumnTool.execute({
			board_id: "board_1",
			column_id: "col_1",
			color: "#FF0000",
		});

		expect(updateColumnFn).toHaveBeenCalledWith(
			"897362094",
			"board_1",
			"col_1",
			{
				name: undefined,
				color: "#FF0000",
			},
		);
	});

	test("should return updated column JSON", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateColumn: vi
				.fn()
				.mockResolvedValue(ok({ ...mockColumn, name: "Updated" })),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await updateColumnTool.execute({
			board_id: "board_1",
			column_id: "col_1",
			name: "Updated",
		});

		const parsed = JSON.parse(result);
		expect(parsed.name).toBe("Updated");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateColumn: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			updateColumnTool.execute({
				board_id: "board_1",
				column_id: "col_1",
				name: "Test",
			}),
		).rejects.toThrow("Resource not found");
	});
});

describe("deleteColumnTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should delete column", async () => {
		const deleteColumnFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteColumn: deleteColumnFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await deleteColumnTool.execute({
			board_id: "board_1",
			column_id: "col_1",
		});

		expect(deleteColumnFn).toHaveBeenCalledWith(
			"897362094",
			"board_1",
			"col_1",
		);
		expect(result).toBe("Column col_1 deleted successfully.");
	});

	test("should resolve account from args", async () => {
		const deleteColumnFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteColumn: deleteColumnFn,
		} as unknown as client.FizzyClient);

		await deleteColumnTool.execute({
			account_slug: "my-account",
			board_id: "board_1",
			column_id: "col_1",
		});

		expect(deleteColumnFn).toHaveBeenCalledWith(
			"my-account",
			"board_1",
			"col_1",
		);
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteColumn: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			deleteColumnTool.execute({ board_id: "board_1", column_id: "col_1" }),
		).rejects.toThrow("Resource not found");
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			deleteColumnTool.execute({ board_id: "board_1", column_id: "col_1" }),
		).rejects.toThrow("No account specified and no default set");
	});
});
