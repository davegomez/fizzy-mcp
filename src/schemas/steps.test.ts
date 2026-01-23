import { describe, expect, test } from "vitest";
import { StepSchema } from "./steps.js";

describe("StepSchema", () => {
	test("should parse valid step", () => {
		const step = {
			id: "step_1",
			content: "Implement feature",
			completed: false,
		};

		const result = StepSchema.parse(step);

		expect(result.id).toBe("step_1");
		expect(result.content).toBe("Implement feature");
		expect(result.completed).toBe(false);
	});

	test("should parse completed step", () => {
		const step = {
			id: "step_2",
			content: "Write tests",
			completed: true,
		};

		const result = StepSchema.parse(step);

		expect(result.completed).toBe(true);
	});

	test("should reject step without id", () => {
		const step = {
			content: "No id",
			completed: false,
		};

		expect(() => StepSchema.parse(step)).toThrow();
	});

	test("should reject step without content", () => {
		const step = {
			id: "step_1",
			completed: false,
		};

		expect(() => StepSchema.parse(step)).toThrow();
	});

	test("should reject step without completed", () => {
		const step = {
			id: "step_1",
			content: "Missing completed",
		};

		expect(() => StepSchema.parse(step)).toThrow();
	});
});
