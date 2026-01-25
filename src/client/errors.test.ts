import { describe, expect, test } from "vitest";
import { ENV_TOKEN } from "../config.js";
import {
	AuthenticationError,
	FizzyApiError,
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	toUserError,
	ValidationError,
} from "./errors.js";

describe("FizzyApiError", () => {
	test("should store status and message", () => {
		const error = new FizzyApiError(500, "Server error");
		expect(error.status).toBe(500);
		expect(error.message).toBe("Server error");
		expect(error.name).toBe("FizzyApiError");
	});

	test("should store validation details", () => {
		const details = { name: ["is required"] };
		const error = new FizzyApiError(422, "Validation failed", details);
		expect(error.details).toEqual(details);
	});
});

describe("AuthenticationError", () => {
	test("should have status 401 and user-friendly message", () => {
		const error = new AuthenticationError();
		expect(error.status).toBe(401);
		expect(error.message).toContain(ENV_TOKEN);
	});
});

describe("ForbiddenError", () => {
	test("should have status 403 and user-friendly message", () => {
		const error = new ForbiddenError();
		expect(error.status).toBe(403);
		expect(error.message).toContain("permission");
	});
});

describe("NotFoundError", () => {
	test("should have status 404 with default message", () => {
		const error = new NotFoundError();
		expect(error.status).toBe(404);
		expect(error.message).toBe("Resource not found.");
	});

	test("should include resource name when provided", () => {
		const error = new NotFoundError("Card #42");
		expect(error.message).toBe("Card #42 not found.");
	});
});

describe("ValidationError", () => {
	test("should have status 422 with formatted details", () => {
		const error = new ValidationError({
			name: ["is required", "is too short"],
		});
		expect(error.status).toBe(422);
		expect(error.message).toContain("name: is required, is too short");
	});

	test("should handle missing details", () => {
		const error = new ValidationError();
		expect(error.message).toBe("Validation failed.");
	});
});

describe("RateLimitError", () => {
	test("should have status 429 and user-friendly message", () => {
		const error = new RateLimitError();
		expect(error.status).toBe(429);
		expect(error.message).toContain("Rate limit");
	});
});

describe("toUserError", () => {
	describe("AuthenticationError (401)", () => {
		test("should format with UNAUTHORIZED prefix", () => {
			const error = new AuthenticationError();
			const userError = toUserError(error);
			expect(userError.message).toBe(
				`[UNAUTHORIZED] Authentication failed. Set ${ENV_TOKEN} environment variable with valid API token.`,
			);
		});

		test("should ignore context for auth errors", () => {
			const error = new AuthenticationError();
			const userError = toUserError(error, { resourceType: "Card" });
			expect(userError.message).toContain("[UNAUTHORIZED]");
			expect(userError.message).not.toContain("Card");
		});
	});

	describe("ForbiddenError (403)", () => {
		test("should format with FORBIDDEN prefix and suggest list tool", () => {
			const error = new ForbiddenError();
			const userError = toUserError(error, {
				resourceType: "Card",
				resourceId: "#42",
			});
			expect(userError.message).toBe(
				"[FORBIDDEN] Card #42: Access denied. Use fizzy_list_cards to verify accessible resources.",
			);
		});

		test("should use default list tool when resource type unknown", () => {
			const error = new ForbiddenError();
			const userError = toUserError(error);
			expect(userError.message).toContain("fizzy_list_boards");
		});
	});

	describe("NotFoundError (404)", () => {
		test("should format with NOT_FOUND prefix and full context", () => {
			const error = new NotFoundError();
			const userError = toUserError(error, {
				resourceType: "Card",
				resourceId: "#42",
				container: 'account "acme-corp"',
			});
			expect(userError.message).toBe(
				'[NOT_FOUND] Card #42: Not found in account "acme-corp". Try fizzy_list_cards to see available items.',
			);
		});

		test("should work with partial context", () => {
			const error = new NotFoundError();
			const userError = toUserError(error, { resourceType: "Board" });
			expect(userError.message).toBe(
				"[NOT_FOUND] Board: Not found. Try fizzy_list_boards to see available items.",
			);
		});

		test("should use Step-specific list tool", () => {
			const error = new NotFoundError();
			const userError = toUserError(error, {
				resourceType: "Step",
				resourceId: "step_123",
			});
			expect(userError.message).toContain("fizzy_get_card");
		});

		test("should fall back to fizzy_list_boards without context", () => {
			const error = new NotFoundError();
			const userError = toUserError(error);
			expect(userError.message).toBe(
				"[NOT_FOUND] Resource: Not found. Try fizzy_list_boards to see available items.",
			);
		});
	});

	describe("ValidationError (422)", () => {
		test("should format with VALIDATION prefix and field details", () => {
			const error = new ValidationError({
				title: ["is required", "must be at least 1 character"],
				description: ["is too long"],
			});
			const userError = toUserError(error);
			expect(userError.message).toBe(
				"[VALIDATION] title: is required, must be at least 1 character; description: is too long.",
			);
		});

		test("should handle validation without details", () => {
			const error = new ValidationError();
			const userError = toUserError(error);
			expect(userError.message).toBe("[VALIDATION] Invalid input.");
		});
	});

	describe("RateLimitError (429)", () => {
		test("should format with RATE_LIMITED prefix", () => {
			const error = new RateLimitError();
			const userError = toUserError(error);
			expect(userError.message).toBe(
				"[RATE_LIMITED] Too many requests. Wait before retrying.",
			);
		});
	});

	describe("Generic FizzyApiError", () => {
		test("should format with ERROR prefix and original message", () => {
			const error = new FizzyApiError(500, "Internal server error");
			const userError = toUserError(error);
			expect(userError.message).toBe("[ERROR] Internal server error");
		});
	});
});
