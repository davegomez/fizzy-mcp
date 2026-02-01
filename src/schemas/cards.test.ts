import { describe, expect, test } from "vitest";
import {
	CardFiltersSchema,
	CardSchema,
	CardStatusSchema,
	CreateCardInputSchema,
	IndexedBySchema,
	UpdateCardInputSchema,
} from "./cards.js";

describe("CardStatusSchema", () => {
	test("should accept 'published' status", () => {
		const result = CardStatusSchema.safeParse("published");
		expect(result.success).toBe(true);
	});

	test("should accept 'drafted' status", () => {
		const result = CardStatusSchema.safeParse("drafted");
		expect(result.success).toBe(true);
	});

	test("should reject 'open' status (lifecycle, not publication)", () => {
		const result = CardStatusSchema.safeParse("open");
		expect(result.success).toBe(false);
	});

	test("should reject 'closed' status (use closed boolean instead)", () => {
		const result = CardStatusSchema.safeParse("closed");
		expect(result.success).toBe(false);
	});

	test("should reject 'deferred' status (use indexed_by instead)", () => {
		const result = CardStatusSchema.safeParse("deferred");
		expect(result.success).toBe(false);
	});
});

describe("IndexedBySchema", () => {
	test.each([
		"closed",
		"not_now",
		"all",
		"stalled",
		"postponing_soon",
		"golden",
	])("should accept '%s' value", (value) => {
		const result = IndexedBySchema.safeParse(value);
		expect(result.success).toBe(true);
	});

	test("should reject 'open' value", () => {
		const result = IndexedBySchema.safeParse("open");
		expect(result.success).toBe(false);
	});

	test("should reject 'deferred' value", () => {
		const result = IndexedBySchema.safeParse("deferred");
		expect(result.success).toBe(false);
	});
});

describe("CardSchema", () => {
	const validCard = {
		id: "card_123",
		number: 42,
		title: "Fix login bug",
		description_html: "<p>Description here</p>",
		status: "published",
		closed: false,
		board_id: "board_1",
		column_id: "col_1",
		tags: ["Bug"],
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

	test("should parse card with closed=true and closed_at date", () => {
		const closedCard = {
			...validCard,
			closed: true,
			closed_at: "2024-01-20T00:00:00Z",
		};
		const result = CardSchema.safeParse(closedCard);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.closed).toBe(true);
			expect(result.data.closed_at).toBe("2024-01-20T00:00:00Z");
		}
	});

	test("should parse card with drafted status", () => {
		const draftedCard = { ...validCard, status: "drafted" };
		const result = CardSchema.safeParse(draftedCard);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe("drafted");
		}
	});

	test("should require closed boolean field", () => {
		const { closed: _, ...cardWithoutClosed } = validCard;
		const result = CardSchema.safeParse(cardWithoutClosed);
		expect(result.success).toBe(false);
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

	test("should parse card with expanded API fields", () => {
		const expanded = {
			...validCard,
			image_url: "https://example.com/image.png",
			golden: true,
			last_active_at: "2024-01-20T00:00:00Z",
			board: {
				id: "board_1",
				name: "Dev",
				url: "https://app.fizzy.do/boards/1",
			},
			column: { id: "col_1", name: "In Progress", color: "blue" },
			creator: { id: "user_1", name: "Jane", role: "owner" },
			comments_url: "https://app.fizzy.do/cards/42/comments",
			reactions_url: "https://app.fizzy.do/cards/42/reactions",
		};
		const result = CardSchema.safeParse(expanded);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.golden).toBe(true);
			expect(result.data.board?.name).toBe("Dev");
			expect(result.data.column?.color).toBe("blue");
			expect(result.data.creator?.role).toBe("owner");
			expect(result.data.image_url).toBe("https://example.com/image.png");
		}
	});

	test("should parse card with null image_url", () => {
		const result = CardSchema.safeParse({ ...validCard, image_url: null });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.image_url).toBeNull();
		}
	});

	test("should parse card with plain text description", () => {
		const result = CardSchema.safeParse({
			...validCard,
			description: "Plain text description",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.description).toBe("Plain text description");
		}
	});

	test("should parse card with null description", () => {
		const result = CardSchema.safeParse({
			...validCard,
			description: null,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.description).toBeNull();
		}
	});

	test("should parse card without description field", () => {
		const result = CardSchema.safeParse(validCard);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.description).toBeUndefined();
		}
	});
});

describe("CardFiltersSchema", () => {
	test("should parse empty filters", () => {
		const result = CardFiltersSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	test("should parse filter with board_ids array", () => {
		const result = CardFiltersSchema.safeParse({
			board_ids: ["board_1", "board_2"],
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.board_ids).toEqual(["board_1", "board_2"]);
		}
	});

	test("should parse filter with indexed_by", () => {
		const result = CardFiltersSchema.safeParse({ indexed_by: "closed" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.indexed_by).toBe("closed");
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
			board_ids: ["board_1"],
			indexed_by: "not_now",
			tag_ids: ["tag_1"],
			assignee_ids: ["user_1"],
		});
		expect(result.success).toBe(true);
	});

	test("should reject invalid indexed_by value", () => {
		const result = CardFiltersSchema.safeParse({ indexed_by: "open" });
		expect(result.success).toBe(false);
	});

	test("should reject column_id (not supported by API)", () => {
		const result = CardFiltersSchema.safeParse({ column_id: "col_1" });
		expect(result.success).toBe(false);
	});

	test("should reject status field (use indexed_by instead)", () => {
		const result = CardFiltersSchema.safeParse({ status: "open" });
		expect(result.success).toBe(false);
	});

	test("should reject board_id singular (use board_ids array)", () => {
		const result = CardFiltersSchema.safeParse({ board_id: "board_1" });
		expect(result.success).toBe(false);
	});

	test("should parse filter with sorted_by", () => {
		const result = CardFiltersSchema.safeParse({ sorted_by: "newest" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sorted_by).toBe("newest");
		}
	});

	test("should reject invalid sorted_by value", () => {
		const result = CardFiltersSchema.safeParse({ sorted_by: "alphabetical" });
		expect(result.success).toBe(false);
	});

	test("should parse filter with terms array", () => {
		const result = CardFiltersSchema.safeParse({ terms: ["login", "bug"] });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.terms).toEqual(["login", "bug"]);
		}
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
