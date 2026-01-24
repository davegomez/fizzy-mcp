import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
	createPaginatedResultSchema,
	DEFAULT_LIMIT,
	MAX_LIMIT,
	MIN_LIMIT,
	PaginationMetadataSchema,
} from "./pagination.js";

describe("PaginationMetadataSchema", () => {
	test("should validate complete metadata with next_cursor", () => {
		const metadata = {
			returned: 5,
			has_more: true,
			next_cursor: "abc",
		};

		const result = PaginationMetadataSchema.safeParse(metadata);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.returned).toBe(5);
			expect(result.data.has_more).toBe(true);
			expect(result.data.next_cursor).toBe("abc");
		}
	});

	test("should validate metadata without next_cursor when no more results", () => {
		const metadata = {
			returned: 0,
			has_more: false,
		};

		const result = PaginationMetadataSchema.safeParse(metadata);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.returned).toBe(0);
			expect(result.data.has_more).toBe(false);
			expect(result.data.next_cursor).toBeUndefined();
		}
	});

	test("should reject negative returned count", () => {
		const metadata = {
			returned: -1,
			has_more: true,
		};

		const result = PaginationMetadataSchema.safeParse(metadata);
		expect(result.success).toBe(false);
	});

	test("should reject non-integer returned count", () => {
		const metadata = {
			returned: 5.5,
			has_more: false,
		};

		const result = PaginationMetadataSchema.safeParse(metadata);
		expect(result.success).toBe(false);
	});
});

describe("pagination constants", () => {
	test("DEFAULT_LIMIT should be 25", () => {
		expect(DEFAULT_LIMIT).toBe(25);
	});

	test("MIN_LIMIT should be 1", () => {
		expect(MIN_LIMIT).toBe(1);
	});

	test("MAX_LIMIT should be 100", () => {
		expect(MAX_LIMIT).toBe(100);
	});
});

describe("createPaginatedResultSchema", () => {
	test("should create schema that validates paginated result structure", () => {
		const ItemSchema = z.object({
			id: z.string(),
			name: z.string(),
		});

		const PaginatedItemSchema = createPaginatedResultSchema(ItemSchema);

		const validResult = {
			items: [
				{ id: "1", name: "First" },
				{ id: "2", name: "Second" },
			],
			pagination: {
				returned: 2,
				has_more: true,
				next_cursor: "cursor123",
			},
		};

		const result = PaginatedItemSchema.safeParse(validResult);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items).toHaveLength(2);
			expect(result.data.pagination.returned).toBe(2);
		}
	});

	test("should validate empty items array", () => {
		const ItemSchema = z.object({ id: z.string() });
		const PaginatedItemSchema = createPaginatedResultSchema(ItemSchema);

		const emptyResult = {
			items: [],
			pagination: {
				returned: 0,
				has_more: false,
			},
		};

		const result = PaginatedItemSchema.safeParse(emptyResult);
		expect(result.success).toBe(true);
	});

	test("should reject invalid item structure", () => {
		const ItemSchema = z.object({
			id: z.string(),
			name: z.string(),
		});

		const PaginatedItemSchema = createPaginatedResultSchema(ItemSchema);

		const invalidResult = {
			items: [{ id: "1" }], // missing name
			pagination: {
				returned: 1,
				has_more: false,
			},
		};

		const result = PaginatedItemSchema.safeParse(invalidResult);
		expect(result.success).toBe(false);
	});

	test("should reject missing pagination", () => {
		const ItemSchema = z.object({ id: z.string() });
		const PaginatedItemSchema = createPaginatedResultSchema(ItemSchema);

		const missingPagination = {
			items: [{ id: "1" }],
		};

		const result = PaginatedItemSchema.safeParse(missingPagination);
		expect(result.success).toBe(false);
	});
});
