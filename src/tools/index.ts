export {
	createBoardTool,
	getBoardTool,
	listBoardsTool,
	updateBoardTool,
} from "./boards.js";
export { toggleCardAttributeTool } from "./card-attribute.js";
export { changeCardStateTool } from "./card-state.js";
export {
	createCardTool,
	deleteCardTool,
	getCardTool,
	listCardsTool,
	updateCardTool,
} from "./cards.js";
export {
	createColumnTool,
	deleteColumnTool,
	getColumnTool,
	listColumnsTool,
	updateColumnTool,
} from "./columns.js";
export {
	createCommentTool,
	deleteCommentTool,
	listCommentsTool,
	updateCommentTool,
} from "./comments.js";
export { bulkCloseCardsTool, createCardFullTool } from "./composite.js";
export { defaultAccountTool, whoamiTool } from "./identity.js";
export { createStepTool, deleteStepTool, updateStepTool } from "./steps.js";
export { listTagsTool } from "./tags.js";
export { attachFileTool } from "./upload.js";

import {
	createBoardTool,
	getBoardTool,
	listBoardsTool,
	updateBoardTool,
} from "./boards.js";
import { toggleCardAttributeTool } from "./card-attribute.js";
import { changeCardStateTool } from "./card-state.js";
import {
	createCardTool,
	deleteCardTool,
	getCardTool,
	listCardsTool,
	updateCardTool,
} from "./cards.js";
import {
	createColumnTool,
	deleteColumnTool,
	getColumnTool,
	listColumnsTool,
	updateColumnTool,
} from "./columns.js";
import {
	createCommentTool,
	deleteCommentTool,
	listCommentsTool,
	updateCommentTool,
} from "./comments.js";
import { bulkCloseCardsTool, createCardFullTool } from "./composite.js";
import { defaultAccountTool, whoamiTool } from "./identity.js";
import { createStepTool, deleteStepTool, updateStepTool } from "./steps.js";
import { listTagsTool } from "./tags.js";
import { attachFileTool } from "./upload.js";

export const allTools = [
	whoamiTool,
	defaultAccountTool,
	listBoardsTool,
	getBoardTool,
	createBoardTool,
	updateBoardTool,
	listCardsTool,
	getCardTool,
	createCardTool,
	updateCardTool,
	deleteCardTool,
	changeCardStateTool,
	toggleCardAttributeTool,
	listTagsTool,
	listColumnsTool,
	getColumnTool,
	createColumnTool,
	updateColumnTool,
	deleteColumnTool,
	createStepTool,
	updateStepTool,
	deleteStepTool,
	listCommentsTool,
	createCommentTool,
	updateCommentTool,
	deleteCommentTool,
	createCardFullTool,
	bulkCloseCardsTool,
	attachFileTool,
];
