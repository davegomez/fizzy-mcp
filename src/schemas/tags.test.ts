import { describe, expect, test } from "vitest";
import { TagSchema } from "./tags.js";

describe("TagSchema", () => {
	test("should validate a complete tag", () => {
		const tag = {
			id: "tag_123",
			title: "Bug",
			color: "#ff0000",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-15T00:00:00Z",
		};

		const result = TagSchema.safeParse(tag);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe("tag_123");
			expect(result.data.title).toBe("Bug");
			expect(result.data.color).toBe("#ff0000");
		}
	});

	test("should reject tag missing required fields", () => {
		const incomplete = {
			id: "tag_123",
			title: "Bug",
		};

		const result = TagSchema.safeParse(incomplete);
		expect(result.success).toBe(false);
	});

	test("should validate tag with any color format", () => {
		const tag = {
			id: "tag_456",
			title: "Feature",
			color: "blue",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-15T00:00:00Z",
		};

		const result = TagSchema.safeParse(tag);
		expect(result.success).toBe(true);
	});
});
