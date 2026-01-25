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
import { ENV_TOKEN } from "../config.js";
import { clearResolverCache } from "../state/account-resolver.js";
import { clearSession, setSession } from "../state/session.js";
import { server } from "../test/mocks/server.js";
import { taskTool } from "./task.js";

const BASE_URL = "https://app.fizzy.do";

function setTestAccount(slug: string): void {
	setSession({
		account: { slug, name: "Test Account", id: "acc_test" },
		user: { id: "user_test", name: "Test User", role: "member" },
	});
}

const mockCard = {
	id: "card_1",
	number: 42,
	title: "Test Card",
	description_html: null,
	status: "open" as const,
	board_id: "board_1",
	column_id: null,
	tags: [{ id: "tag_1", title: "Bug", color: "red" }],
	assignees: [],
	steps_count: 0,
	completed_steps_count: 0,
	comments_count: 0,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-15T00:00:00Z",
	closed_at: null,
	url: "https://app.fizzy.do/test/cards/42",
};

describe("taskTool - create mode", () => {
	beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
	afterEach(() => {
		server.resetHandlers();
		clearSession();
		clearResolverCache();
		resetClient();
	});
	afterAll(() => server.close());

	beforeEach(() => {
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should throw when board_id missing in create mode", async () => {
		setTestAccount("test-account");
		await expect(
			taskTool.execute({ title: "New Card", position: "bottom" }),
		).rejects.toThrow("Create mode requires board_id");
	});

	test("should throw when title missing in create mode", async () => {
		setTestAccount("test-account");
		await expect(
			taskTool.execute({ board_id: "board_1", position: "bottom" }),
		).rejects.toThrow("Create mode requires title");
	});

	test("should create basic card", async () => {
		server.use(
			http.post(`${BASE_URL}/:accountSlug/boards/:boardId/cards`, () => {
				return HttpResponse.json(mockCard, { status: 201 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			board_id: "board_1",
			title: "New Card",
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.mode).toBe("create");
		expect(parsed.card.number).toBe(42);
	});

	test("should create card with steps", async () => {
		server.use(
			http.post(`${BASE_URL}/:accountSlug/boards/:boardId/cards`, () => {
				return HttpResponse.json(mockCard, { status: 201 });
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/steps`, () => {
				return HttpResponse.json(
					{ id: "step_1", content: "Step", completed: false },
					{ status: 201 },
				);
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			board_id: "board_1",
			title: "New Card",
			steps: ["Step 1", "Step 2"],
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.steps_created).toBe(2);
	});

	test("should create card with tags", async () => {
		server.use(
			http.post(`${BASE_URL}/:accountSlug/boards/:boardId/cards`, () => {
				return HttpResponse.json(mockCard, { status: 201 });
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/taggings`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			board_id: "board_1",
			title: "New Card",
			add_tags: ["Feature"],
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.tags_added).toEqual(["Feature"]);
	});

	test("should create card with triage", async () => {
		server.use(
			http.post(`${BASE_URL}/:accountSlug/boards/:boardId/cards`, () => {
				return HttpResponse.json(mockCard, { status: 201 });
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			board_id: "board_1",
			title: "New Card",
			column_id: "col_1",
			position: "top",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.triaged_to).toBe("col_1");
	});

	test("should report partial failures", async () => {
		let stepCallCount = 0;
		server.use(
			http.post(`${BASE_URL}/:accountSlug/boards/:boardId/cards`, () => {
				return HttpResponse.json(mockCard, { status: 201 });
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/steps`, () => {
				stepCallCount++;
				if (stepCallCount === 1) {
					return HttpResponse.json(
						{ id: "step_1", content: "Step 1", completed: false },
						{ status: 201 },
					);
				}
				return HttpResponse.json({}, { status: 404 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			board_id: "board_1",
			title: "New Card",
			steps: ["Step 1", "Step 2"],
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.steps_created).toBe(1);
		expect(parsed.failures).toHaveLength(1);
		expect(parsed.failures[0].operation).toBe("create_step:Step 2");
	});
});

describe("taskTool - update mode", () => {
	beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
	afterEach(() => {
		server.resetHandlers();
		clearSession();
		clearResolverCache();
		resetClient();
	});
	afterAll(() => server.close());

	beforeEach(() => {
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should update title", async () => {
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(mockCard);
			}),
			http.put(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json({ ...mockCard, title: "Updated" });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			title: "Updated",
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.mode).toBe("update");
		expect(parsed.operations.title_updated).toBe(true);
	});

	test("should change status to closed", async () => {
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(mockCard);
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			status: "closed",
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.status_changed).toBe("closed");
	});

	test("should change status to not_now", async () => {
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(mockCard);
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/not_now`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			status: "not_now",
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.status_changed).toBe("not_now");
		expect(parsed.card.status).toBe("deferred");
	});

	test("should add tags with pre-check", async () => {
		const cardWithoutTag = { ...mockCard, tags: [] };
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(cardWithoutTag);
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/taggings`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			add_tags: ["Feature"],
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.tags_added).toEqual(["Feature"]);
	});

	test("should skip adding tag if already present", async () => {
		let taggingsCallCount = 0;
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(mockCard); // Has "Bug" tag
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/taggings`, () => {
				taggingsCallCount++;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			add_tags: ["Bug"], // Already on card
			position: "bottom",
		});

		expect(taggingsCallCount).toBe(0);
		const parsed = JSON.parse(result);
		expect(parsed.operations.tags_added).toBeUndefined();
	});

	test("should remove tags with pre-check", async () => {
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(mockCard); // Has "Bug" tag
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/taggings`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			remove_tags: ["Bug"],
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.tags_removed).toEqual(["Bug"]);
	});

	test("should skip removing tag if not present", async () => {
		let taggingsCallCount = 0;
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(mockCard); // Has "Bug" tag, not "Feature"
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/taggings`, () => {
				taggingsCallCount++;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			remove_tags: ["Feature"], // Not on card
			position: "bottom",
		});

		expect(taggingsCallCount).toBe(0);
		const parsed = JSON.parse(result);
		expect(parsed.operations.tags_removed).toBeUndefined();
	});

	test("should throw when card not found", async () => {
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json({}, { status: 404 });
			}),
		);

		setTestAccount("test-account");
		await expect(
			taskTool.execute({ card_number: 999, title: "Test", position: "bottom" }),
		).rejects.toThrow("[NOT_FOUND] Card #999");
	});

	test("should handle void return from closeCard", async () => {
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(mockCard);
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			status: "closed",
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.status_changed).toBe("closed");
		expect(parsed.card.status).toBe("closed");
	});

	test("should handle void return from reopenCard", async () => {
		const closedCard = { ...mockCard, status: "closed" as const };
		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(closedCard);
			}),
			http.delete(`${BASE_URL}/:accountSlug/cards/:cardNumber/closure`, () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			status: "open",
			position: "bottom",
		});

		const parsed = JSON.parse(result);
		expect(parsed.operations.status_changed).toBe("open");
		expect(parsed.card.status).toBe("open");
	});

	test("should call unTriageCard before triageCard when card already in column", async () => {
		const cardInColumn = { ...mockCard, column_id: "old_col" };
		let unTriageCalled = false;
		let triageCalled = false;

		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(cardInColumn);
			}),
			http.delete(`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`, () => {
				unTriageCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`, () => {
				triageCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			column_id: "new_col",
			position: "top",
		});

		expect(unTriageCalled).toBe(true);
		expect(triageCalled).toBe(true);
		const parsed = JSON.parse(result);
		expect(parsed.operations.triaged_to).toBe("new_col");
	});

	test("should not call unTriageCard when card has no column", async () => {
		let unTriageCalled = false;
		let triageCalled = false;

		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(mockCard); // column_id: null
			}),
			http.delete(`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`, () => {
				unTriageCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`, () => {
				triageCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			column_id: "new_col",
			position: "bottom",
		});

		expect(unTriageCalled).toBe(false);
		expect(triageCalled).toBe(true);
		const parsed = JSON.parse(result);
		expect(parsed.operations.triaged_to).toBe("new_col");
	});

	test("should not call triageCard when unTriageCard fails", async () => {
		const cardInColumn = { ...mockCard, column_id: "old_col" };
		let unTriageCalled = false;
		let triageCalled = false;

		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(cardInColumn);
			}),
			http.delete(`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`, () => {
				unTriageCalled = true;
				return HttpResponse.json({}, { status: 500 });
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`, () => {
				triageCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			column_id: "new_col",
			position: "top",
		});

		expect(unTriageCalled).toBe(true);
		expect(triageCalled).toBe(false);
		const parsed = JSON.parse(result);
		expect(parsed.failures).toHaveLength(1);
		expect(parsed.failures[0].operation).toBe("untriage");
		expect(parsed.operations.triaged_to).toBeUndefined();
	});

	test("should skip untriage and triage when column unchanged", async () => {
		const cardInColumn = { ...mockCard, column_id: "same_col" };
		let unTriageCalled = false;
		let triageCalled = false;

		server.use(
			http.get(`${BASE_URL}/:accountSlug/cards/:cardNumber`, () => {
				return HttpResponse.json(cardInColumn);
			}),
			http.delete(`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`, () => {
				unTriageCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
			http.post(`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`, () => {
				triageCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTestAccount("test-account");
		const result = await taskTool.execute({
			card_number: 42,
			column_id: "same_col",
			position: "top",
		});

		expect(unTriageCalled).toBe(false);
		expect(triageCalled).toBe(false);
		const parsed = JSON.parse(result);
		expect(parsed.operations.triaged_to).toBeUndefined();
	});
});

describe("taskTool - account resolution", () => {
	beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
	afterEach(() => {
		server.resetHandlers();
		clearSession();
		clearResolverCache();
		resetClient();
	});
	afterAll(() => server.close());

	beforeEach(() => {
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should throw when no account and no default set", async () => {
		// Mock whoami to fail so auto-detect doesn't work
		server.use(
			http.get(`${BASE_URL}/my/identity`, () => {
				return HttpResponse.json({}, { status: 401 });
			}),
		);

		await expect(
			taskTool.execute({
				board_id: "board_1",
				title: "Test",
				position: "bottom",
			}),
		).rejects.toThrow(/No account specified/);
	});

	test("should use account_slug from args", async () => {
		let capturedAccountSlug: string | null = null;
		server.use(
			http.post(
				`${BASE_URL}/:accountSlug/boards/:boardId/cards`,
				({ params }) => {
					capturedAccountSlug = params.accountSlug as string;
					return HttpResponse.json(mockCard, { status: 201 });
				},
			),
		);

		await taskTool.execute({
			account_slug: "my-account",
			board_id: "board_1",
			title: "Test",
			position: "bottom",
		});

		expect(capturedAccountSlug).toBe("my-account");
	});
});
