export {
	getDefaultAccountTool,
	setDefaultAccountTool,
	whoamiTool,
} from "./identity.js";
export { listTagsTool } from "./tags.js";

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
	listTagsTool,
];
