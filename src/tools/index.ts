export {
	createBoardTool,
	getBoardTool,
	listBoardsTool,
	updateBoardTool,
} from "./boards.js";
export {
	createColumnTool,
	deleteColumnTool,
	getColumnTool,
	listColumnsTool,
	updateColumnTool,
} from "./columns.js";
export {
	getDefaultAccountTool,
	setDefaultAccountTool,
	whoamiTool,
} from "./identity.js";
export { listTagsTool } from "./tags.js";

import {
	createBoardTool,
	getBoardTool,
	listBoardsTool,
	updateBoardTool,
} from "./boards.js";
import {
	createColumnTool,
	deleteColumnTool,
	getColumnTool,
	listColumnsTool,
	updateColumnTool,
} from "./columns.js";
import {
	getDefaultAccountTool,
	setDefaultAccountTool,
	whoamiTool,
} from "./identity.js";
import { listTagsTool } from "./tags.js";

export const allTools = [
	whoamiTool,
	setDefaultAccountTool,
	getDefaultAccountTool,
	listBoardsTool,
	getBoardTool,
	createBoardTool,
	updateBoardTool,
	listTagsTool,
	listColumnsTool,
	getColumnTool,
	createColumnTool,
	updateColumnTool,
	deleteColumnTool,
];
