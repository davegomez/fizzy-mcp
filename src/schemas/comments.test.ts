import { describe, expect, test } from "vitest";
import {
	CommentBodySchema,
	CommentCardReferenceSchema,
	CommentCreatorSchema,
	CommentSchema,
} from "./comments.js";

describe("CommentCreatorSchema", () => {
	const validCreator = {
		id: "user_123",
		name: "Jane Doe",
		email_address: "jane@example.com",
		role: "owner",
		active: true,
	};

	test("should parse valid creator with all fields", () => {
		const result = CommentCreatorSchema.safeParse(validCreator);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe("user_123");
			expect(result.data.name).toBe("Jane Doe");
			expect(result.data.email_address).toBe("jane@example.com");
			expect(result.data.role).toBe("owner");
			expect(result.data.active).toBe(true);
		}
	});

	test("should parse creator with member role", () => {
		const memberCreator = { ...validCreator, role: "member" };
		const result = CommentCreatorSchema.safeParse(memberCreator);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.role).toBe("member");
		}
	});

	test("should parse creator with inactive status", () => {
		const inactiveCreator = { ...validCreator, active: false };
		const result = CommentCreatorSchema.safeParse(inactiveCreator);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.active).toBe(false);
		}
	});

	test("should reject creator missing required fields", () => {
		const { name: _, ...incompleteCreator } = validCreator;
		const result = CommentCreatorSchema.safeParse(incompleteCreator);
		expect(result.success).toBe(false);
	});
});

describe("CommentBodySchema", () => {
	const validBody = {
		plain_text: "This is a comment",
		html: "<p>This is a comment</p>",
	};

	test("should parse valid body with all fields", () => {
		const result = CommentBodySchema.safeParse(validBody);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.plain_text).toBe("This is a comment");
			expect(result.data.html).toBe("<p>This is a comment</p>");
		}
	});

	test("should reject body missing plain_text", () => {
		const { plain_text: _, ...incompleteBody } = validBody;
		const result = CommentBodySchema.safeParse(incompleteBody);
		expect(result.success).toBe(false);
	});

	test("should reject body missing html", () => {
		const { html: _, ...incompleteBody } = validBody;
		const result = CommentBodySchema.safeParse(incompleteBody);
		expect(result.success).toBe(false);
	});
});

describe("CommentCardReferenceSchema", () => {
	const validCardRef = {
		id: "card_123",
		url: "https://app.fizzy.do/897362094/cards/1",
	};

	test("should parse valid card reference", () => {
		const result = CommentCardReferenceSchema.safeParse(validCardRef);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe("card_123");
			expect(result.data.url).toBe("https://app.fizzy.do/897362094/cards/1");
		}
	});

	test("should reject card reference missing required fields", () => {
		const { id: _, ...incompleteRef } = validCardRef;
		const result = CommentCardReferenceSchema.safeParse(incompleteRef);
		expect(result.success).toBe(false);
	});
});

describe("CommentSchema", () => {
	const validComment = {
		id: "comment_123",
		created_at: "2024-01-10T00:00:00Z",
		updated_at: "2024-01-15T00:00:00Z",
		body: {
			plain_text: "This is a comment",
			html: "<p>This is a comment</p>",
		},
		creator: {
			id: "user_123",
			name: "Jane Doe",
			email_address: "jane@example.com",
			role: "owner",
			active: true,
		},
		card: {
			id: "card_123",
			url: "https://app.fizzy.do/897362094/cards/1",
		},
		reactions_url: "https://app.fizzy.do/897362094/comments/comment_123/reactions",
		url: "https://app.fizzy.do/897362094/comments/comment_123",
	};

	test("should parse valid comment with all fields", () => {
		const result = CommentSchema.safeParse(validComment);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe("comment_123");
			expect(result.data.body.plain_text).toBe("This is a comment");
			expect(result.data.creator.name).toBe("Jane Doe");
			expect(result.data.card.id).toBe("card_123");
		}
	});

	test("should parse comment with nested creator object", () => {
		const result = CommentSchema.safeParse(validComment);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.creator.id).toBe("user_123");
			expect(result.data.creator.email_address).toBe("jane@example.com");
			expect(result.data.creator.role).toBe("owner");
		}
	});

	test("should reject comment missing required fields", () => {
		const { body: _, ...incompleteComment } = validComment;
		const result = CommentSchema.safeParse(incompleteComment);
		expect(result.success).toBe(false);
	});

	test("should reject comment with invalid creator", () => {
		const invalidComment = {
			...validComment,
			creator: { id: "user_123" }, // Missing required fields
		};
		const result = CommentSchema.safeParse(invalidComment);
		expect(result.success).toBe(false);
	});

	test("should reject comment with invalid body", () => {
		const invalidComment = {
			...validComment,
			body: { plain_text: "only plain text" }, // Missing html
		};
		const result = CommentSchema.safeParse(invalidComment);
		expect(result.success).toBe(false);
	});
});
