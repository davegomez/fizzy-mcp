import { FastMCP } from "fastmcp";
import {
	boardsTool,
	bulkCloseCardsTool,
	commentTool,
	completeStepTool,
	defaultAccountTool,
	getCardTool,
	searchTool,
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
	server.addTool(completeStepTool);
	server.addTool(bulkCloseCardsTool);

	return server;
}
