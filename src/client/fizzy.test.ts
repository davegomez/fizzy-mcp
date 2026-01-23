import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { isErr, isOk } from "../types/result.js";
import {
	AuthenticationError,
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	ValidationError,
} from "./errors.js";
import { FizzyClient, getFizzyClient, resetClient } from "./fizzy.js";

describe("FizzyClient", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
		resetClient();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("constructor", () => {
		test("should throw when FIZZY_ACCESS_TOKEN is missing", () => {
			delete process.env.FIZZY_ACCESS_TOKEN;
			expect(() => new FizzyClient()).toThrow("FIZZY_ACCESS_TOKEN");
		});

		test("should use default base URL when FIZZY_BASE_URL not set", () => {
			process.env.FIZZY_ACCESS_TOKEN = "test-token";
			const client = new FizzyClient();
			expect(client.baseUrl).toBe("https://app.fizzy.do");
		});

		test("should use custom base URL from environment", () => {
			process.env.FIZZY_ACCESS_TOKEN = "test-token";
			process.env.FIZZY_BASE_URL = "https://custom.fizzy.do";
			const client = new FizzyClient();
			expect(client.baseUrl).toBe("https://custom.fizzy.do");
		});
	});

	describe("whoami", () => {
		test("should return identity on success", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
			const client = new FizzyClient();
			const result = await client.whoami();

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.accounts).toHaveLength(1);
				expect(result.value.accounts[0]?.slug).toBe("897362094");
			}
		});

		test("should return AuthenticationError on 401", async () => {
			process.env.FIZZY_ACCESS_TOKEN = "invalid";
			const client = new FizzyClient();
			const result = await client.whoami();

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(AuthenticationError);
			}
		});
	});

	describe("error handling", () => {
		beforeEach(() => {
			process.env.FIZZY_ACCESS_TOKEN = "valid-token";
		});

		test("should return ForbiddenError on 403", async () => {
			const client = new FizzyClient();
			const result = await client.request("GET", "/forbidden");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ForbiddenError);
			}
		});

		test("should return NotFoundError on 404", async () => {
			const client = new FizzyClient();
			const result = await client.request("GET", "/not-found");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should return ValidationError on 422 with details", async () => {
			const client = new FizzyClient();
			const result = await client.request("POST", "/validation-error");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ValidationError);
				expect(result.error.details).toEqual({ name: ["is required"] });
			}
		});

		test("should return RateLimitError on 429", async () => {
			const client = new FizzyClient();
			const result = await client.request("GET", "/rate-limited");

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(RateLimitError);
			}
		});

		test("should handle 204 No Content", async () => {
			const client = new FizzyClient();
			const result = await client.request("DELETE", "/no-content");

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.data).toBeUndefined();
			}
		});
	});

	describe("getFizzyClient", () => {
		test("should return singleton instance", () => {
			process.env.FIZZY_ACCESS_TOKEN = "test-token";
			const client1 = getFizzyClient();
			const client2 = getFizzyClient();
			expect(client1).toBe(client2);
		});
	});
});
