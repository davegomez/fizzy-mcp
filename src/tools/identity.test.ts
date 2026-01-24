import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, getDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { defaultAccountTool, whoamiTool } from "./identity.js";

describe("whoamiTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should return identity JSON on success", async () => {
		const mockIdentity = {
			accounts: [
				{
					id: "acc_123",
					name: "Test",
					slug: "/897362094",
					created_at: "2024-01-01",
					user: {
						id: "u1",
						name: "User",
						role: "owner" as const,
						active: true,
						email_address: "a@b.com",
						created_at: "2024-01-01",
						url: "https://example.com",
					},
				},
			],
		};
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			whoami: vi.fn().mockResolvedValue(ok(mockIdentity)),
		} as unknown as client.FizzyClient);

		const result = await whoamiTool.execute({});
		expect(JSON.parse(result)).toEqual(mockIdentity);
	});

	test("should throw UserError on API error", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			whoami: vi.fn().mockResolvedValue(err(new AuthenticationError())),
		} as unknown as client.FizzyClient);

		await expect(whoamiTool.execute({})).rejects.toThrow(
			"Authentication failed",
		);
	});
});

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
				"Action 'set' requires account_slug. Use fizzy_whoami to find available accounts.",
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
