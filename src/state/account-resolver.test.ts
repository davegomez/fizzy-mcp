import { UserError } from "fastmcp";
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
import { ENV_ACCOUNT } from "../config.js";
import { server } from "../test/mocks/server.js";
import { clearResolverCache, resolveAccount } from "./account-resolver.js";
import { clearSession, getSession, setSession } from "./session.js";

const BASE_URL = "https://app.fizzy.do";

describe("resolveAccount", () => {
	beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
	afterEach(() => {
		server.resetHandlers();
		clearSession();
		clearResolverCache();
		resetClient();
		delete process.env[ENV_ACCOUNT];
	});
	afterAll(() => server.close());

	beforeEach(() => {
		process.env.FIZZY_TOKEN = "test-token";
	});

	test("parameter takes precedence over all other sources", async () => {
		setSession({
			account: { slug: "session-account", name: "Session", id: "acc_1" },
			user: { id: "u1", name: "User", role: "member" },
		});
		process.env[ENV_ACCOUNT] = "env-account";

		const result = await resolveAccount("param-account");
		expect(result).toBe("param-account");
	});

	test("strips leading slash from parameter", async () => {
		const result = await resolveAccount("/897362094");
		expect(result).toBe("897362094");
	});

	test("falls back to session state when no parameter", async () => {
		setSession({
			account: { slug: "session-account", name: "Session", id: "acc_1" },
			user: { id: "u1", name: "User", role: "member" },
		});

		const result = await resolveAccount();
		expect(result).toBe("session-account");
	});

	test("falls back to env var when no parameter or session", async () => {
		process.env[ENV_ACCOUNT] = "env-account";

		const result = await resolveAccount();
		expect(result).toBe("env-account");
	});

	test("env var strips leading slash", async () => {
		process.env[ENV_ACCOUNT] = "/env-account";

		const result = await resolveAccount();
		expect(result).toBe("env-account");
	});

	test("auto-detects when single account via API", async () => {
		// Default handler returns single account
		const result = await resolveAccount();
		expect(result).toBe("897362094");
	});

	test("caches API result to avoid repeated calls", async () => {
		// First call should hit API and populate session
		const first = await resolveAccount();
		expect(first).toBe("897362094");
		expect(getSession()).not.toBeUndefined();

		// Clear session but NOT the cache - should still return cached slug
		clearSession();
		const second = await resolveAccount();
		expect(second).toBe("897362094");

		// Clear the cache - now it will need API again (but session is set)
		clearResolverCache();
		const third = await resolveAccount();
		expect(third).toBe("897362094");
	});

	test("sets session when auto-detecting account", async () => {
		await resolveAccount();

		expect(getSession()).toEqual({
			account: { slug: "897362094", name: "Test Account", id: "acc_123" },
			user: { id: "user_123", name: "Test User", role: "owner" },
			source: "auto-detect",
		});
	});

	test("ignores empty env var and continues to auto-detect", async () => {
		process.env[ENV_ACCOUNT] = "";

		const result = await resolveAccount();
		expect(result).toBe("897362094");
	});

	test("throws UserError when multiple accounts and no selection", async () => {
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

		await expect(resolveAccount()).rejects.toThrow(UserError);
		await expect(resolveAccount()).rejects.toThrow(/No account specified/);
	});

	test("throws UserError when no accounts available", async () => {
		server.use(
			http.get(`${BASE_URL}/my/identity`, () => {
				return HttpResponse.json({ accounts: [] });
			}),
		);

		await expect(resolveAccount()).rejects.toThrow(UserError);
	});

	test("throws UserError on API error during auto-detect", async () => {
		server.use(
			http.get(`${BASE_URL}/my/identity`, () => {
				return HttpResponse.json({}, { status: 401 });
			}),
		);

		await expect(resolveAccount()).rejects.toThrow(UserError);
	});
});
