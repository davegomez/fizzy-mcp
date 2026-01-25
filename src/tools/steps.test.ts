import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, test } from "vitest";
import { ENV_TOKEN } from "../config.js";
import { clearResolverCache } from "../state/account-resolver.js";
import { clearSession, setSession } from "../state/session.js";
import { server } from "../test/mocks/server.js";
import { completeStepTool } from "./steps.js";

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

describe("completeStepTool", () => {
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
			completeStepTool.execute({ card_number: 42, step: 1 }),
		).rejects.toThrow(/No account specified/);
	});

	test("should throw when card has no steps", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps`, () => {
				return HttpResponse.json([]);
			}),
		);

		await expect(
			completeStepTool.execute({ card_number: 42, step: 1 }),
		).rejects.toThrow("Card #42 has no steps");
	});

	test("should complete step by 1-based index", async () => {
		setTestAccount("897362094");

		let updateRequest: { stepId: string; body: unknown } | undefined;
		server.use(
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps`, () => {
				return HttpResponse.json(mockSteps);
			}),
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

		const result = await completeStepTool.execute({
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

		let updateRequest: { stepId: string; body: unknown } | undefined;
		server.use(
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps`, () => {
				return HttpResponse.json(mockSteps);
			}),
			http.put(
				`${BASE_URL}/897362094/cards/:cardNumber/steps/:stepId`,
				async ({ params, request }) => {
					updateRequest = {
						stepId: params.stepId as string,
						body: await request.json(),
					};
					return HttpResponse.json({
						id: params.stepId,
						content: "Implement feature",
						completed: true,
					});
				},
			),
		);

		const result = await completeStepTool.execute({
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
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps`, () => {
				return HttpResponse.json(mockSteps);
			}),
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

		await completeStepTool.execute({
			card_number: 42,
			step: "WRITE TESTS",
		});

		expect(updateRequest?.stepId).toBe("step_1");
	});

	test("should throw when index out of range", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps`, () => {
				return HttpResponse.json(mockSteps);
			}),
		);

		await expect(
			completeStepTool.execute({ card_number: 42, step: 10 }),
		).rejects.toThrow("Step index 10 out of range. Card has 3 step(s)");
	});

	test("should throw when no step matches content", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps`, () => {
				return HttpResponse.json(mockSteps);
			}),
		);

		await expect(
			completeStepTool.execute({ card_number: 42, step: "nonexistent" }),
		).rejects.toThrow('No step matches "nonexistent"');
	});

	test("should throw when multiple steps match content", async () => {
		setTestAccount("897362094");

		const stepsWithDupes = [
			{ id: "step_1", content: "Review code", completed: false },
			{ id: "step_2", content: "Review tests", completed: false },
		];

		server.use(
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps`, () => {
				return HttpResponse.json(stepsWithDupes);
			}),
		);

		await expect(
			completeStepTool.execute({ card_number: 42, step: "Review" }),
		).rejects.toThrow('Multiple steps match "Review"');
	});

	test("should return note when step already completed", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps`, () => {
				return HttpResponse.json(mockSteps);
			}),
		);

		const result = await completeStepTool.execute({
			card_number: 42,
			step: 3, // step_3 is already completed
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("step_3");
		expect(parsed.completed).toBe(true);
		expect(parsed.note).toBe("Step was already completed.");
	});

	test("should throw UserError when card not found", async () => {
		setTestAccount("897362094");

		server.use(
			http.get(`${BASE_URL}/897362094/cards/:cardNumber/steps`, () => {
				return HttpResponse.json({}, { status: 404 });
			}),
		);

		await expect(
			completeStepTool.execute({ card_number: 999, step: 1 }),
		).rejects.toThrow("[NOT_FOUND] Step");
	});

	test("should resolve account from args", async () => {
		let listStepsUrl: string | undefined;
		let updateStepsUrl: string | undefined;

		server.use(
			http.get(
				`${BASE_URL}/my-account/cards/:cardNumber/steps`,
				({ request }) => {
					listStepsUrl = request.url;
					return HttpResponse.json(mockSteps);
				},
			),
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

		await completeStepTool.execute({
			account_slug: "my-account",
			card_number: 42,
			step: 1,
		});

		expect(listStepsUrl).toContain("/my-account/cards/42/steps");
		expect(updateStepsUrl).toContain("/my-account/cards/42/steps/step_1");
	});
});
