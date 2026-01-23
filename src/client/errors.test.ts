import { describe, expect, test } from "vitest";
import {
	AuthenticationError,
	FizzyApiError,
	ForbiddenError,
	NotFoundError,
	RateLimitError,
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
		expect(error.message).toContain("FIZZY_ACCESS_TOKEN");
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
