import { beforeEach, describe, expect, test, vi } from "vitest";
import { NotFoundError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { completeStepTool } from "./steps.js";

const mockSteps = [
	{ id: "step_1", content: "Write tests", completed: false },
	{ id: "step_2", content: "Implement feature", completed: false },
	{ id: "step_3", content: "Review PR changes", completed: true },
];

describe("completeStepTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			completeStepTool.execute({ card_number: 42, step: 1 }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should throw when card has no steps", async () => {
		const listStepsFn = vi.fn().mockResolvedValue(ok([]));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listSteps: listStepsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			completeStepTool.execute({ card_number: 42, step: 1 }),
		).rejects.toThrow("Card #42 has no steps");
	});

	test("should complete step by 1-based index", async () => {
		const listStepsFn = vi.fn().mockResolvedValue(ok(mockSteps));
		const updateStepFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockSteps[0], completed: true }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listSteps: listStepsFn,
			updateStep: updateStepFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await completeStepTool.execute({
			card_number: 42,
			step: 1,
		});

		expect(updateStepFn).toHaveBeenCalledWith("897362094", 42, "step_1", {
			completed: true,
		});
		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("step_1");
		expect(parsed.completed).toBe(true);
	});

	test("should complete step by content substring", async () => {
		const listStepsFn = vi.fn().mockResolvedValue(ok(mockSteps));
		const updateStepFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockSteps[1], completed: true }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listSteps: listStepsFn,
			updateStep: updateStepFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await completeStepTool.execute({
			card_number: 42,
			step: "Implement",
		});

		expect(updateStepFn).toHaveBeenCalledWith("897362094", 42, "step_2", {
			completed: true,
		});
		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("step_2");
	});

	test("should match content case-insensitively", async () => {
		const listStepsFn = vi.fn().mockResolvedValue(ok(mockSteps));
		const updateStepFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockSteps[0], completed: true }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listSteps: listStepsFn,
			updateStep: updateStepFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await completeStepTool.execute({
			card_number: 42,
			step: "WRITE TESTS",
		});

		expect(updateStepFn).toHaveBeenCalledWith("897362094", 42, "step_1", {
			completed: true,
		});
	});

	test("should throw when index out of range", async () => {
		const listStepsFn = vi.fn().mockResolvedValue(ok(mockSteps));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listSteps: listStepsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			completeStepTool.execute({ card_number: 42, step: 10 }),
		).rejects.toThrow("Step index 10 out of range. Card has 3 step(s)");
	});

	test("should throw when no step matches content", async () => {
		const listStepsFn = vi.fn().mockResolvedValue(ok(mockSteps));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listSteps: listStepsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			completeStepTool.execute({ card_number: 42, step: "nonexistent" }),
		).rejects.toThrow('No step matches "nonexistent"');
	});

	test("should throw when multiple steps match content", async () => {
		const stepsWithDupes = [
			{ id: "step_1", content: "Review code", completed: false },
			{ id: "step_2", content: "Review tests", completed: false },
		];
		const listStepsFn = vi.fn().mockResolvedValue(ok(stepsWithDupes));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listSteps: listStepsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			completeStepTool.execute({ card_number: 42, step: "Review" }),
		).rejects.toThrow('Multiple steps match "Review"');
	});

	test("should return note when step already completed", async () => {
		const listStepsFn = vi.fn().mockResolvedValue(ok(mockSteps));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listSteps: listStepsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
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
		const listStepsFn = vi.fn().mockResolvedValue(err(new NotFoundError()));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listSteps: listStepsFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			completeStepTool.execute({ card_number: 999, step: 1 }),
		).rejects.toThrow("[NOT_FOUND] Step");
	});

	test("should resolve account from args", async () => {
		const listStepsFn = vi.fn().mockResolvedValue(ok(mockSteps));
		const updateStepFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockSteps[0], completed: true }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			listSteps: listStepsFn,
			updateStep: updateStepFn,
		} as unknown as client.FizzyClient);

		await completeStepTool.execute({
			account_slug: "my-account",
			card_number: 42,
			step: 1,
		});

		expect(listStepsFn).toHaveBeenCalledWith("my-account", 42);
		expect(updateStepFn).toHaveBeenCalledWith("my-account", 42, "step_1", {
			completed: true,
		});
	});
});
