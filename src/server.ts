import { FastMCP } from "fastmcp";
import {
	closeCardTool,
	createBoardTool,
	createCardTool,
	createColumnTool,
	deleteCardTool,
	deleteColumnTool,
	getBoardTool,
	getCardTool,
	getColumnTool,
	getDefaultAccountTool,
	listBoardsTool,
	listCardsTool,
	listColumnsTool,
	listTagsTool,
	notNowCardTool,
	reopenCardTool,
	setDefaultAccountTool,
	toggleAssigneeTool,
	toggleTagTool,
	triageCardTool,
	unTriageCardTool,
	updateBoardTool,
	updateCardTool,
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
	server.addTool(listCardsTool);
	server.addTool(getCardTool);
	server.addTool(createCardTool);
	server.addTool(updateCardTool);
	server.addTool(deleteCardTool);
	server.addTool(closeCardTool);
	server.addTool(reopenCardTool);
	server.addTool(triageCardTool);
	server.addTool(unTriageCardTool);
	server.addTool(notNowCardTool);
	server.addTool(toggleTagTool);
	server.addTool(toggleAssigneeTool);
	server.addTool(listTagsTool);
	server.addTool(listColumnsTool);
	server.addTool(getColumnTool);
	server.addTool(createColumnTool);
	server.addTool(updateColumnTool);
	server.addTool(deleteColumnTool);

	return server;
}
