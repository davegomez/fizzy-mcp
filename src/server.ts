import { FastMCP } from "fastmcp";
import {
	boardsTool,
	commentTool,
	defaultAccountTool,
	getCardTool,
	searchTool,
	stepTool,
	taskTool,
} from "./tools/index.js";

export function createServer(): FastMCP {
	const server = new FastMCP({
		name: "fizzy-mcp",
		version: "1.0.0",
	});

	server.addTool(defaultAccountTool);
	server.addTool(boardsTool);
	server.addTool(searchTool);
	server.addTool(getCardTool);
	server.addTool(taskTool);
	server.addTool(commentTool);
	server.addTool(stepTool);

	return server;
}
