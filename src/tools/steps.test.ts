import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, test } from "vitest";
import { ENV_TOKEN } from "../config.js";
import { clearResolverCache } from "../state/account-resolver.js";
import { clearSession, setSession } from "../state/session.js";
import { server } from "../test/mocks/server.js";
import { stepTool } from "./steps.js";

const BASE_URL = "https://app.fizzy.do";

function setTestAccount(slug: string): void {
	setSession({
		account: { slug, name: "Test Account", id: "acc_test" },
		user: { id: "user_test", name: "Test User", role: "member" },
	});
}

const mockSteps = [
	{ id: "step_1", content: "Write tests", completed: false },
	{ id: "step_2", content: "Implement feature", completed: false },
	{ id: "step_3", content: "Review PR changes", completed: true },
];

const mockCard = {
	id: "card_abc",
	number: 42,
	title: "Test card",
	description_html: null,
	status: "published",
	closed: false,
	board_id: "board_1",
	column_id: null,
	tags: [],
	assignees: [],
	steps_count: 3,
	completed_steps_count: 1,
	comments_count: 0,
	steps: mockSteps,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	closed_at: null,
	url: "https://app.fizzy.do/897362094/cards/42",
};

function mockGetCard(slug = "897362094", card = mockCard) {
	return http.get(`${BASE_URL}/${slug}/cards/:cardNumber`, () => {
		return HttpResponse.json(card);
	});
}

describe("stepTool", () => {
	beforeEach(() => {
		clearSession();
		clearResolverCache();
		process.env[ENV_TOKEN] = "test-token";
	});

	test("should throw when no account and no default set", async () => {
		server.use(
			http.get(`${BASE_URL}/my/identity`, () => {
				return HttpResponse.json({}, { status: 401 });
			}),
		);

		await expect(
			stepTool.execute({ card_number: 42, step: 1 }),
		).rejects.toThrow(/No account specified/);
	});

	// CREATE mode tests

	test("should create a step when no step identifier provided", async () => {
		setTestAccount("897362094");

		let createBody: unknown;
		server.use(
			http.post(
				`${BASE_URL}/897362094/cards/:cardNumber/steps`,
				async ({ request }) => {
					createBody = await request.json();
					// Fall through to base handler by returning undefined? No — capture body, then delegate.
					// Re-implement 201+Location to capture the body for assertion
					return new HttpResponse(null, {
						status: 201,
						headers: {
							Location: "/897362094/cards/42/steps/step_new",
						},
					});
				},
			),
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps/step_new`, () =>
				HttpResponse.json({
					id: "step_new",
					content: "New step",
					completed: false,
				}),
			),
		);

		const result = await stepTool.execute({
			card_number: 42,
			content: "New step",
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("step_new");
		expect(parsed.content).toBe("New step");
		expect(createBody).toEqual({ step: { content: "New step" } });
	});

	test("should create a step with completed: true", async () => {
		setTestAccount("897362094");

		let createBody: unknown;
		server.use(
			http.post(
				`${BASE_URL}/897362094/cards/:cardNumber/steps`,
				async ({ request }) => {
					createBody = await request.json();
					return new HttpResponse(null, {
						status: 201,
						headers: {
							Location: "/897362094/cards/42/steps/step_new",
						},
					});
				},
			),
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps/step_new`, () =>
				HttpResponse.json({
					id: "step_new",
					content: "Done step",
					completed: true,
				}),
			),
		);

		const result = await stepTool.execute({
			card_number: 42,
			content: "Done step",
			completed: true,
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("step_new");
		expect(parsed.content).toBe("Done step");
		expect(parsed.completed).toBe(true);
		expect(createBody).toEqual({
			step: { content: "Done step", completed: true },
		});
	});

	test("should throw when creating without content", async () => {
		setTestAccount("897362094");

		await expect(stepTool.execute({ card_number: 42 })).rejects.toThrow(
			"Create mode requires content",
		);
	});

	// COMPLETE mode tests

	test("should complete step by 1-based index", async () => {
		setTestAccount("897362094");

		let updateRequest: { stepId: string; body: unknown } | undefined;
		server.use(
			mockGetCard(),
			http.put(
				`${BASE_URL}/897362094/cards/:cardNumber/steps/:stepId`,
				async ({ params, request }) => {
					updateRequest = {
						stepId: params.stepId as string,
						body: await request.json(),
					};
					return HttpResponse.json({
						id: params.stepId,
						content: "Write tests",
						completed: true,
					});
				},
			),
		);

		const result = await stepTool.execute({
			card_number: 42,
			step: 1,
		});

		expect(updateRequest?.stepId).toBe("step_1");
		expect(updateRequest?.body).toEqual({ step: { completed: true } });

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("step_1");
		expect(parsed.completed).toBe(true);
	});

	test("should complete step by content substring", async () => {
		setTestAccount("897362094");

		let updateRequest: { stepId: string } | undefined;
		server.use(
			mockGetCard(),
			http.put(
				`${BASE_URL}/897362094/cards/:cardNumber/steps/:stepId`,
				async ({ params }) => {
					updateRequest = { stepId: params.stepId as string };
					return HttpResponse.json({
						id: params.stepId,
						content: "Implement feature",
						completed: true,
					});
				},
			),
		);

		const result = await stepTool.execute({
			card_number: 42,
			step: "Implement",
		});

		expect(updateRequest?.stepId).toBe("step_2");
		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("step_2");
	});

	test("should match content case-insensitively", async () => {
		setTestAccount("897362094");

		let updateRequest: { stepId: string } | undefined;
		server.use(
			mockGetCard(),
			http.put(
				`${BASE_URL}/897362094/cards/:cardNumber/steps/:stepId`,
				async ({ params }) => {
					updateRequest = { stepId: params.stepId as string };
					return HttpResponse.json({
						id: params.stepId,
						content: "Write tests",
						completed: true,
					});
				},
			),
		);

		await stepTool.execute({
			card_number: 42,
			step: "WRITE TESTS",
		});

		expect(updateRequest?.stepId).toBe("step_1");
	});

	test("should return note when step already completed", async () => {
		setTestAccount("897362094");

		server.use(mockGetCard());

		const result = await stepTool.execute({
			card_number: 42,
			step: 3, // step_3 is already completed
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("step_3");
		expect(parsed.completed).toBe(true);
		expect(parsed.note).toBe("Step was already completed.");
	});

	// UNCOMPLETE mode tests

	test("should uncomplete a step", async () => {
		setTestAccount("897362094");

		let updateBody: unknown;
		server.use(
			mockGetCard(),
			http.put(
				`${BASE_URL}/897362094/cards/:cardNumber/steps/:stepId`,
				async ({ params, request }) => {
					updateBody = await request.json();
					return HttpResponse.json({
						id: params.stepId,
						content: "Review PR changes",
						completed: false,
					});
				},
			),
		);

		const result = await stepTool.execute({
			card_number: 42,
			step: 3,
			completed: false,
		});

		expect(updateBody).toEqual({ step: { completed: false } });
		const parsed = JSON.parse(result);
		expect(parsed.completed).toBe(false);
	});

	test("should return note when step already incomplete", async () => {
		setTestAccount("897362094");

		server.use(mockGetCard());

		const result = await stepTool.execute({
			card_number: 42,
			step: 1, // step_1 is already incomplete
			completed: false,
		});

		const parsed = JSON.parse(result);
		expect(parsed.note).toBe("Step was already incomplete.");
	});

	// UPDATE mode tests

	test("should update step content", async () => {
		setTestAccount("897362094");

		let updateBody: unknown;
		server.use(
			mockGetCard(),
			http.put(
				`${BASE_URL}/897362094/cards/:cardNumber/steps/:stepId`,
				async ({ params, request }) => {
					updateBody = await request.json();
					return HttpResponse.json({
						id: params.stepId,
						content: "Write unit tests",
						completed: false,
					});
				},
			),
		);

		const result = await stepTool.execute({
			card_number: 42,
			step: 1,
			content: "Write unit tests",
		});

		expect(updateBody).toEqual({ step: { content: "Write unit tests" } });
		const parsed = JSON.parse(result);
		expect(parsed.content).toBe("Write unit tests");
	});

	test("should update content and completion together", async () => {
		setTestAccount("897362094");

		let updateBody: unknown;
		server.use(
			mockGetCard(),
			http.put(
				`${BASE_URL}/897362094/cards/:cardNumber/steps/:stepId`,
				async ({ params, request }) => {
					updateBody = await request.json();
					return HttpResponse.json({
						id: params.stepId,
						content: "Write unit tests",
						completed: true,
					});
				},
			),
		);

		await stepTool.execute({
			card_number: 42,
			step: 1,
			content: "Write unit tests",
			completed: true,
		});

		expect(updateBody).toEqual({
			step: { content: "Write unit tests", completed: true },
		});
	});

	// DELETE mode tests

	test("should delete a step", async () => {
		setTestAccount("897362094");

		let deletedStepId: string | undefined;
		server.use(
			mockGetCard(),
			http.delete(
				`${BASE_URL}/897362094/cards/:cardNumber/steps/:stepId`,
				({ params }) => {
					deletedStepId = params.stepId as string;
					return new HttpResponse(null, { status: 204 });
				},
			),
		);

		const result = await stepTool.execute({
			card_number: 42,
			step: 1,
			delete: true,
		});

		expect(deletedStepId).toBe("step_1");
		const parsed = JSON.parse(result);
		expect(parsed.deleted).toBe(true);
		expect(parsed.id).toBe("step_1");
	});

	// Error cases

	test("should throw when card has no steps", async () => {
		setTestAccount("897362094");

		server.use(mockGetCard("897362094", { ...mockCard, steps: [] }));

		await expect(
			stepTool.execute({ card_number: 42, step: 1 }),
		).rejects.toThrow("Card #42 has no steps");
	});

	test("should throw when index out of range", async () => {
		setTestAccount("897362094");

		server.use(mockGetCard());

		await expect(
			stepTool.execute({ card_number: 42, step: 10 }),
		).rejects.toThrow("Step index 10 out of range. Card has 3 step(s)");
	});

	test("should throw when no step matches content", async () => {
		setTestAccount("897362094");

		server.use(mockGetCard());

		await expect(
			stepTool.execute({ card_number: 42, step: "nonexistent" }),
		).rejects.toThrow('No step matches "nonexistent"');
	});

	test("should throw when multiple steps match content", async () => {
		setTestAccount("897362094");

		const stepsWithDupes = [
			{ id: "step_1", content: "Review code", completed: false },
			{ id: "step_2", content: "Review tests", completed: false },
		];

		server.use(
			mockGetCard("897362094", {
				...mockCard,
				steps: stepsWithDupes,
			}),
		);

		await expect(
			stepTool.execute({ card_number: 42, step: "Review" }),
		).rejects.toThrow('Multiple steps match "Review"');
	});

	test("should throw UserError when card not found", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/cards/:cardNumber`, () => {
				return HttpResponse.json({}, { status: 404 });
			}),
		);

		await expect(
			stepTool.execute({ card_number: 999, step: 1 }),
		).rejects.toThrow("[NOT_FOUND] Card");
	});

	test("should resolve account from args", async () => {
		let getCardUrl: string | undefined;
		let updateStepsUrl: string | undefined;

		server.use(
			http.get(`${BASE_URL}/my-account/cards/:cardNumber`, ({ request }) => {
				getCardUrl = request.url;
				return HttpResponse.json(mockCard);
			}),
			http.put(
				`${BASE_URL}/my-account/cards/:cardNumber/steps/:stepId`,
				({ request }) => {
					updateStepsUrl = request.url;
					return HttpResponse.json({
						id: "step_1",
						content: "Write tests",
						completed: true,
					});
				},
			),
		);

		await stepTool.execute({
			account_slug: "my-account",
			card_number: 42,
			step: 1,
		});

		expect(getCardUrl).toContain("/my-account/cards/42");
		expect(updateStepsUrl).toContain("/my-account/cards/42/steps/step_1");
	});
});
