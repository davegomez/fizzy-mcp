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

	test("should have all identity tools available", () => {
		const toolNames = allTools.map((t) => t.name);

		expect(toolNames).toContain("fizzy_whoami");
		expect(toolNames).toContain("fizzy_set_default_account");
		expect(toolNames).toContain("fizzy_get_default_account");
	});

	test("should export exactly 3 tools in allTools", () => {
		expect(allTools.length).toBe(3);
	});
});
