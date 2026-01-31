export { boardsTool } from "./boards.js";
export { getCardTool, searchTool } from "./cards.js";
export { commentTool } from "./comments.js";
export { defaultAccountTool } from "./identity.js";
export { stepTool } from "./steps.js";
export { taskTool } from "./task.js";

import { boardsTool } from "./boards.js";
import { getCardTool, searchTool } from "./cards.js";
import { commentTool } from "./comments.js";
import { defaultAccountTool } from "./identity.js";
import { stepTool } from "./steps.js";
import { taskTool } from "./task.js";

export const allTools = [
	defaultAccountTool,
	boardsTool,
	searchTool,
	getCardTool,
	taskTool,
	commentTool,
	stepTool,
];
