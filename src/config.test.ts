import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ENV_ACCOUNT, getAccountFromEnv } from "./config.js";

describe("getAccountFromEnv", () => {
	const originalEnv = process.env[ENV_ACCOUNT];

	beforeEach(() => {
		delete process.env[ENV_ACCOUNT];
	});

	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env[ENV_ACCOUNT] = originalEnv;
		} else {
			delete process.env[ENV_ACCOUNT];
		}
	});

	test("returns undefined when env var not set", () => {
		expect(getAccountFromEnv()).toBeUndefined();
	});

	test("returns account slug from env var", () => {
		process.env[ENV_ACCOUNT] = "897362094";
		expect(getAccountFromEnv()).toBe("897362094");
	});

	test("strips leading slash for consistency", () => {
		process.env[ENV_ACCOUNT] = "/897362094";
		expect(getAccountFromEnv()).toBe("897362094");
	});

	test("returns undefined if env var is empty", () => {
		process.env[ENV_ACCOUNT] = "";
		expect(getAccountFromEnv()).toBeUndefined();
	});
});
