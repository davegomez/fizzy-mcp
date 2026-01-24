import { beforeEach, describe, expect, test, vi } from "vitest";
import { NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { changeCardStateTool } from "./card-state.js";

const mockCard = {
	id: "card_1",
	number: 42,
	title: "Fix authentication bug",
	description_html: "<p>Users are getting logged out unexpectedly</p>",
	status: "open" as const,
	board_id: "board_1",
	column_id: "col_1",
	tags: [{ id: "tag_1", title: "bug", color: "red" }],
	assignees: [
		{ id: "user_1", name: "Alice", email_address: "alice@example.com" },
	],
	steps_count: 3,
	completed_steps_count: 1,
	comments_count: 5,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-15T00:00:00Z",
	closed_at: null,
	url: "https://app.fizzy.do/897362094/cards/42",
};

describe("changeCardStateTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	describe("action dispatch", () => {
		test("close action calls closeCard", async () => {
			const closedCard = { ...mockCard, status: "closed" as const };
			const closeCardFn = vi.fn().mockResolvedValue(ok(closedCard));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				closeCard: closeCardFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await changeCardStateTool.execute({
				card_number: 42,
				action: "close",
			});

			expect(closeCardFn).toHaveBeenCalledWith("897362094", 42);
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("close");
			expect(parsed.card.status).toBe("closed");
		});

		test("reopen action calls reopenCard", async () => {
			const openCard = { ...mockCard, status: "open" as const };
			const reopenCardFn = vi.fn().mockResolvedValue(ok(openCard));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				reopenCard: reopenCardFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await changeCardStateTool.execute({
				card_number: 42,
				action: "reopen",
			});

			expect(reopenCardFn).toHaveBeenCalledWith("897362094", 42);
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("reopen");
		});

		test("archive action calls closeCard (alias)", async () => {
			const closedCard = { ...mockCard, status: "closed" as const };
			const closeCardFn = vi.fn().mockResolvedValue(ok(closedCard));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				closeCard: closeCardFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await changeCardStateTool.execute({
				card_number: 42,
				action: "archive",
			});

			expect(closeCardFn).toHaveBeenCalledWith("897362094", 42);
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("archive");
		});

		test("activate action calls reopenCard (alias)", async () => {
			const openCard = { ...mockCard, status: "open" as const };
			const reopenCardFn = vi.fn().mockResolvedValue(ok(openCard));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				reopenCard: reopenCardFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await changeCardStateTool.execute({
				card_number: 42,
				action: "activate",
			});

			expect(reopenCardFn).toHaveBeenCalledWith("897362094", 42);
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("activate");
		});

		test("triage action calls triageCard with column_id", async () => {
			const triagedCard = { ...mockCard, column_id: "col_2" };
			const triageCardFn = vi.fn().mockResolvedValue(ok(triagedCard));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				triageCard: triageCardFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await changeCardStateTool.execute({
				card_number: 42,
				action: "triage",
				column_id: "col_2",
			});

			expect(triageCardFn).toHaveBeenCalledWith(
				"897362094",
				42,
				"col_2",
				undefined,
			);
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("triage");
		});

		test("triage action passes position parameter", async () => {
			const triagedCard = { ...mockCard, column_id: "col_2" };
			const triageCardFn = vi.fn().mockResolvedValue(ok(triagedCard));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				triageCard: triageCardFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			await changeCardStateTool.execute({
				card_number: 42,
				action: "triage",
				column_id: "col_2",
				position: "top",
			});

			expect(triageCardFn).toHaveBeenCalledWith(
				"897362094",
				42,
				"col_2",
				"top",
			);
		});

		test("untriage action calls unTriageCard", async () => {
			const untriagedCard = { ...mockCard, column_id: null };
			const unTriageCardFn = vi.fn().mockResolvedValue(ok(untriagedCard));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				unTriageCard: unTriageCardFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await changeCardStateTool.execute({
				card_number: 42,
				action: "untriage",
			});

			expect(unTriageCardFn).toHaveBeenCalledWith("897362094", 42);
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("untriage");
		});

		test("defer action calls notNowCard", async () => {
			const deferredCard = { ...mockCard, status: "deferred" as const };
			const notNowCardFn = vi.fn().mockResolvedValue(ok(deferredCard));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				notNowCard: notNowCardFn,
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await changeCardStateTool.execute({
				card_number: 42,
				action: "defer",
			});

			expect(notNowCardFn).toHaveBeenCalledWith("897362094", 42);
			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("defer");
			expect(parsed.card.status).toBe("deferred");
		});
	});

	describe("validation", () => {
		test("triage without column_id throws UserError with hint", async () => {
			setDefaultAccount("897362094");

			await expect(
				changeCardStateTool.execute({
					card_number: 42,
					action: "triage",
				}),
			).rejects.toThrow("fizzy_list_columns");
		});
	});

	describe("account resolution", () => {
		test("uses provided account_slug", async () => {
			const closeCardFn = vi
				.fn()
				.mockResolvedValue(ok({ ...mockCard, status: "closed" as const }));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				closeCard: closeCardFn,
			} as unknown as client.FizzyClient);

			await changeCardStateTool.execute({
				account_slug: "my-account",
				card_number: 42,
				action: "close",
			});

			expect(closeCardFn).toHaveBeenCalledWith("my-account", 42);
		});

		test("falls back to default account", async () => {
			setDefaultAccount("default-account");
			const closeCardFn = vi
				.fn()
				.mockResolvedValue(ok({ ...mockCard, status: "closed" as const }));
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				closeCard: closeCardFn,
			} as unknown as client.FizzyClient);

			await changeCardStateTool.execute({
				card_number: 42,
				action: "close",
			});

			expect(closeCardFn).toHaveBeenCalledWith("default-account", 42);
		});

		test("throws when no account and no default", async () => {
			await expect(
				changeCardStateTool.execute({
					card_number: 42,
					action: "close",
				}),
			).rejects.toThrow("No account specified and no default set");
		});
	});

	describe("return format", () => {
		test("returns JSON with action field", async () => {
			const closedCard = { ...mockCard, status: "closed" as const };
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				closeCard: vi.fn().mockResolvedValue(ok(closedCard)),
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await changeCardStateTool.execute({
				card_number: 42,
				action: "close",
			});

			const parsed = JSON.parse(result);
			expect(parsed.action).toBe("close");
		});

		test("returns card object with expected fields", async () => {
			const closedCard = { ...mockCard, status: "closed" as const };
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				closeCard: vi.fn().mockResolvedValue(ok(closedCard)),
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await changeCardStateTool.execute({
				card_number: 42,
				action: "close",
			});

			const parsed = JSON.parse(result);
			expect(parsed.card).toHaveProperty("id");
			expect(parsed.card).toHaveProperty("number");
			expect(parsed.card).toHaveProperty("title");
			expect(parsed.card).toHaveProperty("description");
			expect(parsed.card).toHaveProperty("status");
			expect(parsed.card).toHaveProperty("board_id");
			expect(parsed.card).toHaveProperty("column_id");
			expect(parsed.card).toHaveProperty("tags");
			expect(parsed.card).toHaveProperty("assignees");
			expect(parsed.card).toHaveProperty("url");
		});

		test("converts description_html to markdown", async () => {
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				closeCard: vi.fn().mockResolvedValue(ok(mockCard)),
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			const result = await changeCardStateTool.execute({
				card_number: 42,
				action: "close",
			});

			const parsed = JSON.parse(result);
			expect(parsed.card.description).toBe(
				"Users are getting logged out unexpectedly",
			);
		});
	});

	describe("error handling", () => {
		test("client errors converted to UserError", async () => {
			vi.spyOn(client, "getFizzyClient").mockReturnValue({
				closeCard: vi.fn().mockResolvedValue(err(new NotFoundError())),
			} as unknown as client.FizzyClient);

			setDefaultAccount("897362094");
			await expect(
				changeCardStateTool.execute({
					card_number: 999,
					action: "close",
				}),
			).rejects.toThrow("[NOT_FOUND] Card #999");
		});
	});
});
