import { describe, expect, test } from "vitest";
import { err, isErr, isOk, ok, type Result } from "./result.js";

describe("Result type", () => {
	test("should create success result with ok()", () => {
		const result = ok(42);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(42);
	});

	test("should create failure result with err()", () => {
		const error = new Error("failed");
		const result = err(error);
		expect(result.ok).toBe(false);
		expect(result.error).toBe(error);
	});

	test("should narrow type with isOk()", () => {
		const success: Result<number, Error> = ok(42);
		if (isOk(success)) {
			expect(success.value).toBe(42);
		}
	});

	test("should narrow type with isErr()", () => {
		const failure: Result<number, Error> = err(new Error("oops"));
		if (isErr(failure)) {
			expect(failure.error.message).toBe("oops");
		}
	});
});
