import { beforeEach, describe, expect, test, vi } from "vitest";
import { NotFoundError, ValidationError } from "../client/errors.js";
import * as client from "../client/index.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { createStepTool, deleteStepTool, updateStepTool } from "./steps.js";

const mockStep = {
	id: "step_1",
	content: "Write tests",
	completed: false,
};

const mockStep2 = {
	id: "step_2",
	content: "Implement feature",
	completed: false,
};

describe("createStepTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const createStepFn = vi.fn().mockResolvedValue(ok(mockStep));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createStep: createStepFn,
		} as unknown as client.FizzyClient);

		await createStepTool.execute({
			account_slug: "my-account",
			card_number: 42,
			steps: ["Write tests"],
		});
		expect(createStepFn).toHaveBeenCalledWith("my-account", 42, {
			content: "Write tests",
		});
	});

	test("should resolve account from default when not provided", async () => {
		setDefaultAccount("default-account");
		const createStepFn = vi.fn().mockResolvedValue(ok(mockStep));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createStep: createStepFn,
		} as unknown as client.FizzyClient);

		await createStepTool.execute({
			card_number: 42,
			steps: ["Write tests"],
		});
		expect(createStepFn).toHaveBeenCalledWith("default-account", 42, {
			content: "Write tests",
		});
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			createStepTool.execute({ card_number: 42, steps: ["Write tests"] }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should strip leading slash from account slug", async () => {
		const createStepFn = vi.fn().mockResolvedValue(ok(mockStep));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createStep: createStepFn,
		} as unknown as client.FizzyClient);

		await createStepTool.execute({
			account_slug: "/897362094",
			card_number: 42,
			steps: ["Write tests"],
		});
		expect(createStepFn).toHaveBeenCalledWith("897362094", 42, {
			content: "Write tests",
		});
	});

	test("should create multiple steps in order", async () => {
		const createStepFn = vi
			.fn()
			.mockResolvedValueOnce(ok(mockStep))
			.mockResolvedValueOnce(ok(mockStep2));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createStep: createStepFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await createStepTool.execute({
			card_number: 42,
			steps: ["Write tests", "Implement feature"],
		});

		expect(createStepFn).toHaveBeenCalledTimes(2);
		expect(createStepFn).toHaveBeenNthCalledWith(1, "897362094", 42, {
			content: "Write tests",
		});
		expect(createStepFn).toHaveBeenNthCalledWith(2, "897362094", 42, {
			content: "Implement feature",
		});

		const parsed = JSON.parse(result);
		expect(parsed.created).toHaveLength(2);
		expect(parsed.created[0].content).toBe("Write tests");
		expect(parsed.created[1].content).toBe("Implement feature");
		expect(parsed.failed).toHaveLength(0);
	});

	test("should return created step details", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createStep: vi.fn().mockResolvedValue(ok(mockStep)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await createStepTool.execute({
			card_number: 42,
			steps: ["Write tests"],
		});

		const parsed = JSON.parse(result);
		expect(parsed.created[0].id).toBe("step_1");
		expect(parsed.created[0].content).toBe("Write tests");
		expect(parsed.created[0].completed).toBe(false);
	});

	test("should continue on individual failures (best-effort)", async () => {
		const createStepFn = vi
			.fn()
			.mockResolvedValueOnce(
				err(new ValidationError({ content: ["is too long"] })),
			)
			.mockResolvedValueOnce(ok(mockStep2));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createStep: createStepFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await createStepTool.execute({
			card_number: 42,
			steps: ["This step has invalid content", "Implement feature"],
		});

		const parsed = JSON.parse(result);
		expect(parsed.created).toHaveLength(1);
		expect(parsed.created[0].content).toBe("Implement feature");
		expect(parsed.failed).toHaveLength(1);
		expect(parsed.failed[0].content).toBe("This step has invalid content");
		expect(parsed.failed[0].error).toContain("Validation");
	});

	test("should throw when all steps fail", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			createStep: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			createStepTool.execute({
				card_number: 999,
				steps: ["Write tests"],
			}),
		).rejects.toThrow("[NOT_FOUND] Step");
	});
});

describe("updateStepTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const updateStepFn = vi.fn().mockResolvedValue(ok(mockStep));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateStep: updateStepFn,
		} as unknown as client.FizzyClient);

		await updateStepTool.execute({
			account_slug: "my-account",
			card_number: 42,
			step_id: "step_1",
			content: "Updated content",
		});
		expect(updateStepFn).toHaveBeenCalledWith("my-account", 42, "step_1", {
			content: "Updated content",
			completed: undefined,
		});
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			updateStepTool.execute({
				card_number: 42,
				step_id: "step_1",
				content: "Updated",
			}),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should update content only", async () => {
		const updateStepFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockStep, content: "Updated content" }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateStep: updateStepFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await updateStepTool.execute({
			card_number: 42,
			step_id: "step_1",
			content: "Updated content",
		});
		expect(updateStepFn).toHaveBeenCalledWith("897362094", 42, "step_1", {
			content: "Updated content",
			completed: undefined,
		});
	});

	test("should toggle completion only", async () => {
		const updateStepFn = vi
			.fn()
			.mockResolvedValue(ok({ ...mockStep, completed: true }));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateStep: updateStepFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await updateStepTool.execute({
			card_number: 42,
			step_id: "step_1",
			completed: true,
		});

		expect(updateStepFn).toHaveBeenCalledWith("897362094", 42, "step_1", {
			content: undefined,
			completed: true,
		});

		const parsed = JSON.parse(result);
		expect(parsed.completed).toBe(true);
	});

	test("should update both content and completion", async () => {
		const updateStepFn = vi
			.fn()
			.mockResolvedValue(
				ok({ ...mockStep, content: "New content", completed: true }),
			);
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateStep: updateStepFn,
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await updateStepTool.execute({
			card_number: 42,
			step_id: "step_1",
			content: "New content",
			completed: true,
		});

		expect(updateStepFn).toHaveBeenCalledWith("897362094", 42, "step_1", {
			content: "New content",
			completed: true,
		});
	});

	test("should return updated step details", async () => {
		const updatedStep = { ...mockStep, content: "Updated", completed: true };
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateStep: vi.fn().mockResolvedValue(ok(updatedStep)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await updateStepTool.execute({
			card_number: 42,
			step_id: "step_1",
			content: "Updated",
			completed: true,
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("step_1");
		expect(parsed.content).toBe("Updated");
		expect(parsed.completed).toBe(true);
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			updateStep: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			updateStepTool.execute({
				card_number: 42,
				step_id: "nonexistent",
				content: "Test",
			}),
		).rejects.toThrow("[NOT_FOUND] Step nonexistent");
	});
});

describe("deleteStepTool", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	test("should resolve account from args", async () => {
		const deleteStepFn = vi.fn().mockResolvedValue(ok(undefined));
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteStep: deleteStepFn,
		} as unknown as client.FizzyClient);

		await deleteStepTool.execute({
			account_slug: "my-account",
			card_number: 42,
			step_id: "step_1",
		});
		expect(deleteStepFn).toHaveBeenCalledWith("my-account", 42, "step_1");
	});

	test("should throw when no account and no default set", async () => {
		await expect(
			deleteStepTool.execute({ card_number: 42, step_id: "step_1" }),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should return success message", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteStep: vi.fn().mockResolvedValue(ok(undefined)),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		const result = await deleteStepTool.execute({
			card_number: 42,
			step_id: "step_1",
		});

		expect(result).toBe("Step step_1 deleted from card #42.");
	});

	test("should throw UserError on not found", async () => {
		vi.spyOn(client, "getFizzyClient").mockReturnValue({
			deleteStep: vi.fn().mockResolvedValue(err(new NotFoundError())),
		} as unknown as client.FizzyClient);

		setDefaultAccount("897362094");
		await expect(
			deleteStepTool.execute({ card_number: 42, step_id: "nonexistent" }),
		).rejects.toThrow("[NOT_FOUND] Step nonexistent");
	});
});
