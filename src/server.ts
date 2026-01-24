import { FastMCP } from "fastmcp";
import {
	attachFileTool,
	bulkCloseCardsTool,
	changeCardStateTool,
	createBoardTool,
	createCardFullTool,
	createCardTool,
	createColumnTool,
	createCommentTool,
	createStepTool,
	defaultAccountTool,
	deleteCardTool,
	deleteColumnTool,
	deleteCommentTool,
	deleteStepTool,
	getBoardTool,
	getCardTool,
	getColumnTool,
	listBoardsTool,
	listCardsTool,
	listColumnsTool,
	listCommentsTool,
	listTagsTool,
	toggleCardAttributeTool,
	updateBoardTool,
	updateCardTool,
	updateColumnTool,
	updateCommentTool,
	updateStepTool,
	whoamiTool,
} from "./tools/index.js";

export function createServer(): FastMCP {
	const server = new FastMCP({
		name: "fizzy-mcp",
		version: "1.0.0",
	});

	server.addTool(whoamiTool);
	server.addTool(defaultAccountTool);
	server.addTool(listBoardsTool);
	server.addTool(getBoardTool);
	server.addTool(createBoardTool);
	server.addTool(updateBoardTool);
	server.addTool(listCardsTool);
	server.addTool(getCardTool);
	server.addTool(createCardTool);
	server.addTool(updateCardTool);
	server.addTool(deleteCardTool);
	server.addTool(changeCardStateTool);
	server.addTool(toggleCardAttributeTool);
	server.addTool(listTagsTool);
	server.addTool(listColumnsTool);
	server.addTool(getColumnTool);
	server.addTool(createColumnTool);
	server.addTool(updateColumnTool);
	server.addTool(deleteColumnTool);
	server.addTool(createStepTool);
	server.addTool(updateStepTool);
	server.addTool(deleteStepTool);
	server.addTool(listCommentsTool);
	server.addTool(createCommentTool);
	server.addTool(updateCommentTool);
	server.addTool(deleteCommentTool);
	server.addTool(createCardFullTool);
	server.addTool(bulkCloseCardsTool);
	server.addTool(attachFileTool);

	return server;
}
