import { HttpResponse, http } from "msw";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { resetClient } from "../client/fizzy.js";
import {
	clearSession,
	getDefaultAccount,
	getSession,
} from "../state/session.js";
import { server } from "../test/mocks/server.js";
import { defaultAccountTool } from "./identity.js";

const BASE_URL = "https://app.fizzy.do";

describe("defaultAccountTool", () => {
	beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
	afterEach(() => {
		server.resetHandlers();
		clearSession();
		resetClient();
	});
	afterAll(() => server.close());

	beforeEach(() => {
		process.env.FIZZY_TOKEN = "test-token";
	});

	describe("get action", () => {
		test("returns null when no default set", async () => {
			const result = await defaultAccountTool.execute({ action: "get" });
			const parsed = JSON.parse(result);
			expect(parsed).toEqual({ action: "get", account_slug: null });
		});

		test("returns current default when set", async () => {
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
		test("sets account and returns it", async () => {
			const result = await defaultAccountTool.execute({
				action: "set",
				account_slug: "897362094",
			});
			const parsed = JSON.parse(result);
			expect(parsed).toEqual({ action: "set", account_slug: "897362094" });
			expect(getDefaultAccount()).toBe("897362094");
		});

		test("populates full session context via whoami", async () => {
			await defaultAccountTool.execute({
				action: "set",
				account_slug: "897362094",
			});

			const session = getSession();
			expect(session).toEqual({
				account: { slug: "897362094", name: "Test Account", id: "acc_123" },
				user: { id: "user_123", name: "Test User", role: "owner" },
				source: "explicit",
			});
		});

		test("throws when set without account_slug", async () => {
			await expect(
				defaultAccountTool.execute({ action: "set" }),
			).rejects.toThrow(
				"Action 'set' requires account_slug. Use fizzy_account tool with action 'list' to discover available accounts.",
			);
		});

		test("strips leading slash from account_slug", async () => {
			await defaultAccountTool.execute({
				action: "set",
				account_slug: "/897362094",
			});
			expect(getDefaultAccount()).toBe("897362094");
		});

		test("throws when account not found in identity", async () => {
			await expect(
				defaultAccountTool.execute({
					action: "set",
					account_slug: "nonexistent",
				}),
			).rejects.toThrow(/Account "nonexistent" not found/);
		});
	});

	describe("list action", () => {
		test("returns accounts array", async () => {
			const result = await defaultAccountTool.execute({ action: "list" });
			const parsed = JSON.parse(result);

			expect(parsed.action).toBe("list");
			expect(parsed.accounts).toHaveLength(1);
			expect(parsed.accounts[0]).toEqual({
				slug: "897362094",
				name: "Test Account",
				id: "acc_123",
			});
		});

		test("returns multiple accounts when available", async () => {
			server.use(
				http.get(`${BASE_URL}/my/identity`, () => {
					return HttpResponse.json({
						accounts: [
							{
								id: "acc_1",
								name: "Account One",
								slug: "account-one",
								created_at: "2024-01-01T00:00:00Z",
								user: {
									id: "user_1",
									name: "User",
									role: "owner",
									active: true,
									email_address: "test@example.com",
									created_at: "2024-01-01T00:00:00Z",
									url: "https://app.fizzy.do/users/user_1",
								},
							},
							{
								id: "acc_2",
								name: "Account Two",
								slug: "account-two",
								created_at: "2024-01-01T00:00:00Z",
								user: {
									id: "user_1",
									name: "User",
									role: "member",
									active: true,
									email_address: "test@example.com",
									created_at: "2024-01-01T00:00:00Z",
									url: "https://app.fizzy.do/users/user_1",
								},
							},
						],
					});
				}),
			);

			const result = await defaultAccountTool.execute({ action: "list" });
			const parsed = JSON.parse(result);

			expect(parsed.accounts).toHaveLength(2);
			expect(parsed.accounts[0].slug).toBe("account-one");
			expect(parsed.accounts[1].slug).toBe("account-two");
		});
	});

	describe("return format", () => {
		test("get and set return consistent JSON shape", async () => {
			const getResult = await defaultAccountTool.execute({ action: "get" });
			const getParsed = JSON.parse(getResult);
			expect(getParsed).toHaveProperty("action");
			expect(getParsed).toHaveProperty("account_slug");

			const setResult = await defaultAccountTool.execute({
				action: "set",
				account_slug: "897362094",
			});
			const setParsed = JSON.parse(setResult);
			expect(setParsed).toHaveProperty("action");
			expect(setParsed).toHaveProperty("account_slug");
		});

		test("list returns accounts array", async () => {
			const result = await defaultAccountTool.execute({ action: "list" });
			const parsed = JSON.parse(result);
			expect(parsed).toHaveProperty("action", "list");
			expect(parsed).toHaveProperty("accounts");
			expect(Array.isArray(parsed.accounts)).toBe(true);
		});
	});
});
