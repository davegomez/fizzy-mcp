import { beforeEach, describe, expect, test } from "vitest";
import { clearDefaultAccount, getDefaultAccount } from "../state/session.js";
import { defaultAccountTool } from "./identity.js";

describe("defaultAccountTool", () => {
	beforeEach(() => {
		clearDefaultAccount();
	});

	describe("get action", () => {
		test("should return null when no default set", async () => {
			const result = await defaultAccountTool.execute({ action: "get" });
			const parsed = JSON.parse(result);
			expect(parsed).toEqual({ action: "get", account_slug: null });
		});

		test("should return current default when set", async () => {
			await defaultAccountTool.execute({
				action: "set",
				account_slug: "897362094",
			});
			const result = await defaultAccountTool.execute({ action: "get" });
			const parsed = JSON.parse(result);
			expect(parsed).toEqual({ action: "get", account_slug: "897362094" });
		});
	});

	describe("set action", () => {
		test("should set account and return it", async () => {
			const result = await defaultAccountTool.execute({
				action: "set",
				account_slug: "897362094",
			});
			const parsed = JSON.parse(result);
			expect(parsed).toEqual({ action: "set", account_slug: "897362094" });
			expect(getDefaultAccount()).toBe("897362094");
		});

		test("should throw when set without account_slug", async () => {
			await expect(
				defaultAccountTool.execute({ action: "set" }),
			).rejects.toThrow(
				"Action 'set' requires account_slug. Use fizzy_boards to discover available accounts.",
			);
		});

		test("should strip leading slash from account_slug", async () => {
			await defaultAccountTool.execute({
				action: "set",
				account_slug: "/897362094",
			});
			expect(getDefaultAccount()).toBe("897362094");
		});
	});

	describe("return format", () => {
		test("both actions return consistent JSON shape", async () => {
			const getResult = await defaultAccountTool.execute({ action: "get" });
			const getParsed = JSON.parse(getResult);
			expect(getParsed).toHaveProperty("action");
			expect(getParsed).toHaveProperty("account_slug");

			const setResult = await defaultAccountTool.execute({
				action: "set",
				account_slug: "test",
			});
			const setParsed = JSON.parse(setResult);
			expect(setParsed).toHaveProperty("action");
			expect(setParsed).toHaveProperty("account_slug");
		});
	});
});
