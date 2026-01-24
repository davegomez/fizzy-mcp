import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthenticationError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { listTagsTool } from "./tags.js";

describe("listTagsTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

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

	test("should resolve account from args", async () => {
		const listTagsFn = vi.fn().mockResolvedValue(
			ok({
				items: mockTags.slice(0, 1),
				pagination: { returned: 1, has_more: false },
			}),
		);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: listTagsFn,
		} as unknown as client.FizzyClient);

		await listTagsTool.execute({ account_slug: "my-account", limit: 25 });
		expect(listTagsFn).toHaveBeenCalledWith("my-account", {
			limit: 25,
			cursor: undefined,
		});
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const listTagsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: listTagsFn,
		} as unknown as client.FizzyClient);

		await listTagsTool.execute({ limit: 25 });
		expect(listTagsFn).toHaveBeenCalledWith("default-account", {
			limit: 25,
			cursor: undefined,
		});
	});

	test("should throw when no account and no default set", async () => {
		await expect(listTagsTool.execute({ limit: 25 })).rejects.toThrow(
			"No account specified and no default set",
		);
	});

	test("should strip leading slash from account slug", async () => {
		const listTagsFn = vi
			.fn()
			.mockResolvedValue(
				ok({ items: [], pagination: { returned: 0, has_more: false } }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: listTagsFn,
		} as unknown as client.FizzyClient);

		await listTagsTool.execute({ account_slug: "/897362094", limit: 25 });
		expect(listTagsFn).toHaveBeenCalledWith("897362094", {
			limit: 25,
			cursor: undefined,
		});
	});

	test("should return JSON with paginated tag list", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: vi
				.fn()
				.mockResolvedValue(
					ok({ items: mockTags, pagination: { returned: 2, has_more: false } }),
				),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listTagsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(2);
		expect(parsed.items[0].title).toBe("Bug");
		expect(parsed.items[1].title).toBe("Feature");
		expect(parsed.pagination.returned).toBe(2);
	});

	test("should return empty items array when no tags found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: vi
				.fn()
				.mockResolvedValue(
					ok({ items: [], pagination: { returned: 0, has_more: false } }),
				),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await listTagsTool.execute({ limit: 25 });

		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(0);
		expect(parsed.pagination.returned).toBe(0);
	});

	test("should throw UserError on API error", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listTags: vi.fn().mockResolvedValue(err(new AuthenticationError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(listTagsTool.execute({ limit: 25 })).rejects.toThrow(
			"Authentication failed",
		);
	});
});
