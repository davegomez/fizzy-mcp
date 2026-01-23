import { FastMCP } from "fastmcp";
import {
	getDefaultAccountTool,
	listTagsTool,
	setDefaultAccountTool,
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
	server.addTool(listTagsTool);

	return server;
}
