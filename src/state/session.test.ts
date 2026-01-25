import { beforeEach, describe, expect, test } from "vitest";
import {
	clearSession,
	getDefaultAccount,
	getSession,
	type SessionContext,
	setSession,
} from "./session.js";

describe("session state", () => {
	beforeEach(() => {
		clearSession();
	});

	describe("setSession / getSession", () => {
		test("stores full account and user context", () => {
			const ctx: SessionContext = {
				account: { slug: "897362094", name: "Acme Corp", id: "acc_123" },
				user: { id: "user_456", name: "Jane Doe", role: "owner" },
			};
			setSession(ctx);
			expect(getSession()).toEqual(ctx);
		});

		test("overwrites previous session", () => {
			setSession({
				account: { slug: "111", name: "First", id: "acc_1" },
				user: { id: "u1", name: "User 1", role: "member" },
			});
			const newCtx: SessionContext = {
				account: { slug: "222", name: "Second", id: "acc_2" },
				user: { id: "u2", name: "User 2", role: "owner" },
			};
			setSession(newCtx);
			expect(getSession()).toEqual(newCtx);
		});
	});

	describe("getDefaultAccount", () => {
		test("returns undefined when no session set", () => {
			expect(getDefaultAccount()).toBeUndefined();
		});

		test("returns account slug from session", () => {
			setSession({
				account: { slug: "897362094", name: "Acme", id: "acc_123" },
				user: { id: "u1", name: "User", role: "member" },
			});
			expect(getDefaultAccount()).toBe("897362094");
		});
	});

	describe("clearSession", () => {
		test("clears all session state", () => {
			setSession({
				account: { slug: "897362094", name: "Acme", id: "acc_123" },
				user: { id: "u1", name: "User", role: "member" },
			});
			clearSession();
			expect(getSession()).toBeUndefined();
			expect(getDefaultAccount()).toBeUndefined();
		});
	});
});
