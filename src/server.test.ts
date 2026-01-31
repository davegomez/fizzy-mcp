import { describe, expect, test } from "vitest";
import { createServer } from "./server.js";
import { allTools } from "./tools/index.js";

describe("createServer", () => {
	test("should create server with correct name", () => {
		const server = createServer();
		expect(server.options.name).toBe("fizzy-mcp");
	});

	test("should create server without throwing", () => {
		expect(() => createServer()).not.toThrow();
	});

	test("should have identity tool available", () => {
		const toolNames = allTools.map((t) => t.name);
		expect(toolNames).toContain("fizzy_account");
	});

	test("should have boards tool available", () => {
		const toolNames = allTools.map((t) => t.name);
		expect(toolNames).toContain("fizzy_boards");
	});

	test("should have search and get card tools available", () => {
		const toolNames = allTools.map((t) => t.name);
		expect(toolNames).toContain("fizzy_search");
		expect(toolNames).toContain("fizzy_get_card");
	});

	test("should have task tool available", () => {
		const toolNames = allTools.map((t) => t.name);
		expect(toolNames).toContain("fizzy_task");
	});

	test("should have comment tool available", () => {
		const toolNames = allTools.map((t) => t.name);
		expect(toolNames).toContain("fizzy_comment");
	});

	test("should have step tool available", () => {
		const toolNames = allTools.map((t) => t.name);
		expect(toolNames).toContain("fizzy_step");
	});

	test("should export exactly 7 tools in allTools", () => {
		expect(allTools.length).toBe(7);
	});
});
