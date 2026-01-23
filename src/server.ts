import { FastMCP } from "fastmcp";
import {
	createBoardTool,
	createColumnTool,
	deleteColumnTool,
	getBoardTool,
	getColumnTool,
	getDefaultAccountTool,
	listBoardsTool,
	listColumnsTool,
	listTagsTool,
	setDefaultAccountTool,
	updateBoardTool,
	updateColumnTool,
	whoamiTool,
} from "./tools/index.js";

export function createServer(): FastMCP {
	const server = new FastMCP({
		name: "fizzy-mcp",
		version: "1.0.0",
	});

	server.addTool(whoamiTool);
	server.addTool(setDefaultAccountTool);
	server.addTool(getDefaultAccountTool);
	server.addTool(listBoardsTool);
	server.addTool(getBoardTool);
	server.addTool(createBoardTool);
	server.addTool(updateBoardTool);
	server.addTool(listTagsTool);
	server.addTool(listColumnsTool);
	server.addTool(getColumnTool);
	server.addTool(createColumnTool);
	server.addTool(updateColumnTool);
	server.addTool(deleteColumnTool);

	return server;
}
