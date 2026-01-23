import { describe, expect, test } from "vitest";
import {
	ColumnSchema,
	CreateColumnInputSchema,
	UpdateColumnInputSchema,
} from "./columns.js";

describe("ColumnSchema", () => {
	const validColumn = {
		id: "col_abc123",
		name: "In Progress",
		color: "#FF5733",
		position: 1,
		cards_count: 5,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-15T00:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_1/columns/col_abc123",
	};

	test("parses valid column", () => {
		const result = ColumnSchema.safeParse(validColumn);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe("col_abc123");
			expect(result.data.name).toBe("In Progress");
			expect(result.data.color).toBe("#FF5733");
			expect(result.data.position).toBe(1);
			expect(result.data.cards_count).toBe(5);
		}
	});

	test("requires id", () => {
		const { id: _, ...noId } = validColumn;
		const result = ColumnSchema.safeParse(noId);
		expect(result.success).toBe(false);
	});

	test("requires name", () => {
		const { name: _, ...noName } = validColumn;
		const result = ColumnSchema.safeParse(noName);
		expect(result.success).toBe(false);
	});

	test("requires color", () => {
		const { color: _, ...noColor } = validColumn;
		const result = ColumnSchema.safeParse(noColor);
		expect(result.success).toBe(false);
	});

	test("requires position", () => {
		const { position: _, ...noPosition } = validColumn;
		const result = ColumnSchema.safeParse(noPosition);
		expect(result.success).toBe(false);
	});

	test("requires cards_count", () => {
		const { cards_count: _, ...noCardsCount } = validColumn;
		const result = ColumnSchema.safeParse(noCardsCount);
		expect(result.success).toBe(false);
	});

	test("requires valid url", () => {
		const result = ColumnSchema.safeParse({
			...validColumn,
			url: "not-a-url",
		});
		expect(result.success).toBe(false);
	});
});

describe("CreateColumnInputSchema", () => {
	test("parses valid input with name only", () => {
		const result = CreateColumnInputSchema.safeParse({ name: "Backlog" });
		expect(result.success).toBe(true);
	});

	test("parses valid input with name and color", () => {
		const result = CreateColumnInputSchema.safeParse({
			name: "Backlog",
			color: "#00FF00",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.color).toBe("#00FF00");
		}
	});

	test("requires name", () => {
		const result = CreateColumnInputSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	test("requires non-empty name", () => {
		const result = CreateColumnInputSchema.safeParse({ name: "" });
		expect(result.success).toBe(false);
	});

	test("color is optional", () => {
		const result = CreateColumnInputSchema.safeParse({ name: "Test" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.color).toBeUndefined();
		}
	});
});

describe("UpdateColumnInputSchema", () => {
	test("parses valid input with name only", () => {
		const result = UpdateColumnInputSchema.safeParse({ name: "New Name" });
		expect(result.success).toBe(true);
	});

	test("parses valid input with color only", () => {
		const result = UpdateColumnInputSchema.safeParse({ color: "#FF0000" });
		expect(result.success).toBe(true);
	});

	test("parses valid input with both", () => {
		const result = UpdateColumnInputSchema.safeParse({
			name: "Updated",
			color: "#0000FF",
		});
		expect(result.success).toBe(true);
	});

	test("parses empty object (all optional)", () => {
		const result = UpdateColumnInputSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	test("requires non-empty name when provided", () => {
		const result = UpdateColumnInputSchema.safeParse({ name: "" });
		expect(result.success).toBe(false);
	});
});
