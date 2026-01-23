import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError } from "../client/errors.js";
import * as client from "../client/index.js";
import {
	clearDefaultAccount,
	setDefaultAccount,
} from "../state/session.js";
import { err, ok } from "../types/result.js";
import { listTagsTool } from "./tags.js";

describe("listTagsTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const mockTags = [
			{
				id: "tag_1",
				title: "Bug",
				color: "#ff0000",
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-15T00:00:00Z",
			},
		];
		const listTagsFn = vi.fn().mockResolvedValue(ok(mockTags));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: listTagsFn,
		} as unknown as client.FizzyClient);

		await listTagsTool.execute({ account_slug: "my-account" });
		expect(listTagsFn).toHaveBeenCalledWith("my-account");
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const listTagsFn = vi.fn().mockResolvedValue(ok([]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: listTagsFn,
		} as unknown as client.FizzyClient);

		await listTagsTool.execute({});
		expect(listTagsFn).toHaveBeenCalledWith("default-account");
	});

	test("should throw when no account and no default set", async () => {
		await expect(listTagsTool.execute({})).rejects.toThrow(
			"No account specified and no default set",
		);
	});

	test("should strip leading slash from account slug", async () => {
		const listTagsFn = vi.fn().mockResolvedValue(ok([]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: listTagsFn,
		} as unknown as client.FizzyClient);

		await listTagsTool.execute({ account_slug: "/897362094" });
		expect(listTagsFn).toHaveBeenCalledWith("897362094");
	});

	test("should return formatted tag list", async () => {
		const mockTags = [
			{
				id: "tag_1",
				title: "Bug",
				color: "#ff0000",
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-15T00:00:00Z",
			},
			{
				id: "tag_2",
				title: "Feature",
				color: "#00ff00",
				created_at: "2024-01-02T00:00:00Z",
				updated_at: "2024-01-16T00:00:00Z",
			},
		];
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: vi.fn().mockResolvedValue(ok(mockTags)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listTagsTool.execute({});

		expect(result).toContain("Bug (#ff0000)");
		expect(result).toContain("Feature (#00ff00)");
	});

	test("should return message when no tags found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: vi.fn().mockResolvedValue(ok([])),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listTagsTool.execute({});

		expect(result).toBe("No tags found.");
	});

	test("should throw UserError on API error", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: vi.fn().mockResolvedValue(err(new AuthenticationError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(listTagsTool.execute({})).rejects.toThrow(
			"Authentication failed",
		);
	});
});
