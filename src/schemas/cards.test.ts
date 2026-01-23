import { describe, expect, test } from "vitest";
import {
	CardFiltersSchema,
	CardSchema,
	CreateCardInputSchema,
	UpdateCardInputSchema,
} from "./cards.js";

describe("CardSchema", () => {
	const validCard = {
		id: "card_123",
		number: 42,
		title: "Fix login bug",
		description_html: "<p>Description here</p>",
		status: "open",
		board_id: "board_1",
		column_id: "col_1",
		tags: [{ id: "tag_1", title: "Bug", color: "#ff0000" }],
		assignees: [
			{ id: "user_1", name: "Jane Doe", email_address: "jane@example.com" },
		],
		steps_count: 3,
		completed_steps_count: 1,
		comments_count: 5,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-15T00:00:00Z",
		closed_at: null,
		url: "https://app.fizzy.do/897362094/cards/42",
	};

	test("should parse valid card with all fields", () => {
		const result = CardSchema.safeParse(validCard);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.number).toBe(42);
			expect(result.data.tags).toHaveLength(1);
			expect(result.data.assignees).toHaveLength(1);
		}
	});

	test("should parse card with null column_id (inbox card)", () => {
		const inboxCard = { ...validCard, column_id: null };
		const result = CardSchema.safeParse(inboxCard);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.column_id).toBeNull();
		}
	});

	test("should parse card with empty tags and assignees", () => {
		const emptyCard = { ...validCard, tags: [], assignees: [] };
		const result = CardSchema.safeParse(emptyCard);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.tags).toHaveLength(0);
			expect(result.data.assignees).toHaveLength(0);
		}
	});

	test("should parse card with closed status and closed_at date", () => {
		const closedCard = {
			...validCard,
			status: "closed",
			closed_at: "2024-01-20T00:00:00Z",
		};
		const result = CardSchema.safeParse(closedCard);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe("closed");
			expect(result.data.closed_at).toBe("2024-01-20T00:00:00Z");
		}
	});

	test("should parse card with deferred status", () => {
		const deferredCard = { ...validCard, status: "deferred" };
		const result = CardSchema.safeParse(deferredCard);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe("deferred");
		}
	});

	test("should reject card with invalid status", () => {
		const invalidCard = { ...validCard, status: "invalid" };
		const result = CardSchema.safeParse(invalidCard);
		expect(result.success).toBe(false);
	});

	test("should reject card missing required fields", () => {
		const { title: _, ...incompleteCard } = validCard;
		const result = CardSchema.safeParse(incompleteCard);
		expect(result.success).toBe(false);
	});
});

describe("CardFiltersSchema", () => {
	test("should parse empty filters", () => {
		const result = CardFiltersSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	test("should parse filter with board_id", () => {
		const result = CardFiltersSchema.safeParse({ board_id: "board_1" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.board_id).toBe("board_1");
		}
	});

	test("should parse filter with column_id", () => {
		const result = CardFiltersSchema.safeParse({ column_id: "col_1" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.column_id).toBe("col_1");
		}
	});

	test("should parse filter with status", () => {
		const result = CardFiltersSchema.safeParse({ status: "open" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe("open");
		}
	});

	test("should parse filter with tag_ids array", () => {
		const result = CardFiltersSchema.safeParse({
			tag_ids: ["tag_1", "tag_2"],
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.tag_ids).toEqual(["tag_1", "tag_2"]);
		}
	});

	test("should parse filter with assignee_ids array", () => {
		const result = CardFiltersSchema.safeParse({
			assignee_ids: ["user_1", "user_2"],
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.assignee_ids).toEqual(["user_1", "user_2"]);
		}
	});

	test("should parse filter with all options", () => {
		const result = CardFiltersSchema.safeParse({
			board_id: "board_1",
			column_id: "col_1",
			status: "closed",
			tag_ids: ["tag_1"],
			assignee_ids: ["user_1"],
		});
		expect(result.success).toBe(true);
	});

	test("should reject invalid status", () => {
		const result = CardFiltersSchema.safeParse({ status: "invalid" });
		expect(result.success).toBe(false);
	});
});

describe("CreateCardInputSchema", () => {
	test("should parse with title only", () => {
		const result = CreateCardInputSchema.safeParse({ title: "New Card" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.title).toBe("New Card");
			expect(result.data.description).toBeUndefined();
		}
	});

	test("should parse with title and description", () => {
		const result = CreateCardInputSchema.safeParse({
			title: "New Card",
			description: "Some description",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.description).toBe("Some description");
		}
	});

	test("should reject empty title", () => {
		const result = CreateCardInputSchema.safeParse({ title: "" });
		expect(result.success).toBe(false);
	});
});

describe("UpdateCardInputSchema", () => {
	test("should parse with title only", () => {
		const result = UpdateCardInputSchema.safeParse({ title: "Updated" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.title).toBe("Updated");
		}
	});

	test("should parse with description only", () => {
		const result = UpdateCardInputSchema.safeParse({
			description: "New desc",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.description).toBe("New desc");
		}
	});

	test("should parse empty object (no updates)", () => {
		const result = UpdateCardInputSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	test("should reject empty title string", () => {
		const result = UpdateCardInputSchema.safeParse({ title: "" });
		expect(result.success).toBe(false);
	});
});
