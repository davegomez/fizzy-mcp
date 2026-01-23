import { describe, expect, test } from "vitest";
import {
	BoardSchema,
	ColumnSummarySchema,
	CreateBoardInputSchema,
	UpdateBoardInputSchema,
} from "./boards.js";

describe("ColumnSummarySchema", () => {
	test("should parse valid column summary", () => {
		const column = {
			id: "col_123",
			name: "To Do",
			color: "blue",
			cards_count: 5,
			position: 0,
		};
		expect(ColumnSummarySchema.parse(column)).toEqual(column);
	});

	test("should reject missing required fields", () => {
		const column = { id: "col_123", name: "To Do" };
		expect(() => ColumnSummarySchema.parse(column)).toThrow();
	});
});

describe("BoardSchema", () => {
	const validBoard = {
		id: "board_123",
		name: "Project Board",
		slug: "project-board",
		description: "A project board",
		columns: [
			{
				id: "col_1",
				name: "Backlog",
				color: "gray",
				cards_count: 10,
				position: 0,
			},
			{
				id: "col_2",
				name: "In Progress",
				color: "blue",
				cards_count: 3,
				position: 1,
			},
		],
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-15T12:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_123",
	};

	test("should parse valid board", () => {
		expect(BoardSchema.parse(validBoard)).toEqual(validBoard);
	});

	test("should parse board with null description", () => {
		const board = { ...validBoard, description: null };
		expect(BoardSchema.parse(board)).toEqual(board);
	});

	test("should parse board with empty columns", () => {
		const board = { ...validBoard, columns: [] };
		expect(BoardSchema.parse(board)).toEqual(board);
	});

	test("should reject missing required fields", () => {
		const { name, ...boardWithoutName } = validBoard;
		expect(() => BoardSchema.parse(boardWithoutName)).toThrow();
	});

	test("should reject invalid url", () => {
		const board = { ...validBoard, url: "not-a-url" };
		expect(() => BoardSchema.parse(board)).toThrow();
	});

	test("should validate nested column structure", () => {
		const board = {
			...validBoard,
			columns: [{ id: "col_1", name: "Bad Column" }],
		};
		expect(() => BoardSchema.parse(board)).toThrow();
	});
});

describe("CreateBoardInputSchema", () => {
	test("should parse valid create input", () => {
		const input = { name: "New Board", description: "Description" };
		expect(CreateBoardInputSchema.parse(input)).toEqual(input);
	});

	test("should allow missing description", () => {
		const input = { name: "New Board" };
		expect(CreateBoardInputSchema.parse(input)).toEqual(input);
	});

	test("should reject empty name", () => {
		const input = { name: "" };
		expect(() => CreateBoardInputSchema.parse(input)).toThrow();
	});

	test("should reject missing name", () => {
		const input = { description: "No name" };
		expect(() => CreateBoardInputSchema.parse(input)).toThrow();
	});
});

describe("UpdateBoardInputSchema", () => {
	test("should parse valid update with all fields", () => {
		const input = { name: "Updated", description: "New desc" };
		expect(UpdateBoardInputSchema.parse(input)).toEqual(input);
	});

	test("should allow partial update with name only", () => {
		const input = { name: "Updated" };
		expect(UpdateBoardInputSchema.parse(input)).toEqual(input);
	});

	test("should allow partial update with description only", () => {
		const input = { description: "New desc" };
		expect(UpdateBoardInputSchema.parse(input)).toEqual(input);
	});

	test("should allow empty object", () => {
		const input = {};
		expect(UpdateBoardInputSchema.parse(input)).toEqual(input);
	});

	test("should reject empty name string", () => {
		const input = { name: "" };
		expect(() => UpdateBoardInputSchema.parse(input)).toThrow();
	});
});
