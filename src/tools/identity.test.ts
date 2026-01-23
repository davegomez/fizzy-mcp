import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, getDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import {
	getDefaultAccountTool,
	setDefaultAccountTool,
	whoamiTool,
} from "./identity.js";

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

describe("setDefaultAccountTool", () => {
	beforeEach(() => {
		clearDefaultAccount();
	});

	test("should set default account and return confirmation", async () => {
		const result = await setDefaultAccountTool.execute({
			account_slug: "897362094",
		});
		expect(result).toContain("897362094");
		expect(getDefaultAccount()).toBe("897362094");
	});

	test("should strip leading slash from slug", async () => {
		await setDefaultAccountTool.execute({ account_slug: "/897362094" });
		expect(getDefaultAccount()).toBe("897362094");
	});
});

describe("getDefaultAccountTool", () => {
	beforeEach(() => {
		clearDefaultAccount();
	});

	test("should return message when no default set", async () => {
		const result = await getDefaultAccountTool.execute({});
		expect(result).toContain("No default account set");
	});

	test("should return current default account", async () => {
		await setDefaultAccountTool.execute({ account_slug: "897362094" });
		const result = await getDefaultAccountTool.execute({});
		expect(result).toContain("897362094");
	});
});
