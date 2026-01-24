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
		expect(toolNames).toContain("fizzy_default_account");
	});

	test("should have board tools available", () => {
		const toolNames = allTools.map((t) => t.name);

		expect(toolNames).toContain("fizzy_list_boards");
		expect(toolNames).toContain("fizzy_get_board");
		expect(toolNames).toContain("fizzy_create_board");
		expect(toolNames).toContain("fizzy_update_board");
	});

	test("should have tag tools available", () => {
		const toolNames = allTools.map((t) => t.name);

		expect(toolNames).toContain("fizzy_list_tags");
	});

	test("should have column tools available", () => {
		const toolNames = allTools.map((t) => t.name);

		expect(toolNames).toContain("fizzy_list_columns");
		expect(toolNames).toContain("fizzy_get_column");
		expect(toolNames).toContain("fizzy_create_column");
		expect(toolNames).toContain("fizzy_update_column");
		expect(toolNames).toContain("fizzy_delete_column");
	});

	test("should have card tools available", () => {
		const toolNames = allTools.map((t) => t.name);

		expect(toolNames).toContain("fizzy_list_cards");
		expect(toolNames).toContain("fizzy_get_card");
		expect(toolNames).toContain("fizzy_create_card");
		expect(toolNames).toContain("fizzy_update_card");
		expect(toolNames).toContain("fizzy_delete_card");
		expect(toolNames).toContain("fizzy_change_card_state");
		expect(toolNames).toContain("fizzy_toggle_card_attribute");
	});

	test("should have step tools available", () => {
		const toolNames = allTools.map((t) => t.name);

		expect(toolNames).toContain("fizzy_create_step");
		expect(toolNames).toContain("fizzy_update_step");
		expect(toolNames).toContain("fizzy_delete_step");
	});

	test("should have comment tools available", () => {
		const toolNames = allTools.map((t) => t.name);

		expect(toolNames).toContain("fizzy_list_comments");
		expect(toolNames).toContain("fizzy_create_comment");
		expect(toolNames).toContain("fizzy_update_comment");
		expect(toolNames).toContain("fizzy_delete_comment");
	});

	test("should have composite tools available", () => {
		const toolNames = allTools.map((t) => t.name);

		expect(toolNames).toContain("fizzy_create_card_full");
		expect(toolNames).toContain("fizzy_bulk_close_cards");
	});

	test("should have upload tools available", () => {
		const toolNames = allTools.map((t) => t.name);

		expect(toolNames).toContain("fizzy_attach_file");
	});

	test("should export exactly 29 tools in allTools", () => {
		expect(allTools.length).toBe(29);
	});
});
