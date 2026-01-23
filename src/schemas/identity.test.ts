import { describe, expect, test } from "vitest";
import {
	AccountSchema,
	IdentityResponseSchema,
	UserSchema,
} from "./identity.js";

describe("UserSchema", () => {
	test("should parse valid user", () => {
		const user = {
			id: "user_123",
			name: "Test User",
			role: "owner",
			active: true,
			email_address: "test@example.com",
			created_at: "2024-01-01T00:00:00Z",
			url: "https://app.fizzy.do/users/user_123",
		};
		expect(UserSchema.parse(user)).toEqual(user);
	});

	test("should reject invalid role", () => {
		const user = {
			id: "user_123",
			name: "Test User",
			role: "admin",
			active: true,
			email_address: "test@example.com",
			created_at: "2024-01-01T00:00:00Z",
			url: "https://app.fizzy.do/users/user_123",
		};
		expect(() => UserSchema.parse(user)).toThrow();
	});
});

describe("AccountSchema", () => {
	test("should parse valid account with nested user", () => {
		const account = {
			id: "acc_123",
			name: "Test Account",
			slug: "/897362094",
			created_at: "2024-01-01T00:00:00Z",
			user: {
				id: "user_123",
				name: "Test User",
				role: "member",
				active: true,
				email_address: "test@example.com",
				created_at: "2024-01-01T00:00:00Z",
				url: "https://app.fizzy.do/users/user_123",
			},
		};
		expect(AccountSchema.parse(account)).toEqual(account);
	});
});

describe("IdentityResponseSchema", () => {
	test("should parse valid identity response", () => {
		const response = {
			accounts: [
				{
					id: "acc_123",
					name: "Test Account",
					slug: "/897362094",
					created_at: "2024-01-01T00:00:00Z",
					user: {
						id: "user_123",
						name: "Test User",
						role: "owner",
						active: true,
						email_address: "test@example.com",
						created_at: "2024-01-01T00:00:00Z",
						url: "https://app.fizzy.do/users/user_123",
					},
				},
			],
		};
		expect(IdentityResponseSchema.parse(response)).toEqual(response);
	});

	test("should parse empty accounts array", () => {
		const response = { accounts: [] };
		expect(IdentityResponseSchema.parse(response)).toEqual(response);
	});
});
