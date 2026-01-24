import { UserError } from "fastmcp";
import { z } from "zod";
import {
	type FizzyApiError,
	getFizzyClient,
	toUserError,
} from "../client/index.js";
import type { Step } from "../schemas/steps.js";
import { getDefaultAccount } from "../state/session.js";
import { isErr } from "../types/result.js";

function resolveAccount(accountSlug?: string): string {
	const slug = (accountSlug || getDefaultAccount())?.replace(/^\//, "");
	if (!slug) {
		throw new UserError(
			"No account specified and no default set. Use fizzy_set_default_account first.",
		);
	}
	return slug;
}

interface StepResult {
	id: string;
	content: string;
	completed: boolean;
}

interface FailedStep {
	content: string;
	error: string;
}

interface CreateStepsResult {
	created: StepResult[];
	failed: FailedStep[];
}

function formatStep(step: Step): StepResult {
	return {
		id: step.id,
		content: step.content,
		completed: step.completed,
	};
}

export const createStepTool = {
	name: "fizzy_create_step",
	description: `Create checklist steps on a card.

Add one or more subtasks to break down work into actionable items.

**When to use:**
1. Break a task into smaller actionable items
2. Create a checklist for process steps or requirements

**Arguments:** \`account_slug\` (optional), \`card_number\` (required), \`steps\` (required — array of strings, min 1)

**Returns:** JSON with \`created\` array (id, content, completed) and \`failed\` array (content, error) for partial success handling.
Example: \`{"created": [{"id": "abc", "content": "Review PR", "completed": false}], "failed": []}\`

**Note:** Steps are created sequentially. If some fail, others may still succeed.

**Related:** Use \`fizzy_update_step\` to mark steps complete. See \`fizzy_get_card\` for step counts.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if omitted."),
		card_number: z.number().describe("Card number to add steps to."),
		steps: z
			.array(z.string())
			.min(1)
			.describe(
				"Array of step content strings to create, in order. Min 1 item.",
			),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		steps: string[];
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();

		const result: CreateStepsResult = { created: [], failed: [] };
		let firstError: FizzyApiError | undefined;

		for (const content of args.steps) {
			const stepResult = await client.createStep(slug, args.card_number, {
				content,
			});
			if (isErr(stepResult)) {
				if (!firstError) {
					firstError = stepResult.error;
				}
				result.failed.push({
					content,
					error: stepResult.error.message,
				});
			} else {
				result.created.push(formatStep(stepResult.value));
			}
		}

		// If all failed, throw an error
		if (result.created.length === 0 && firstError) {
			throw toUserError(firstError, {
				resourceType: "Step",
				container: `card #${args.card_number}`,
			});
		}

		return JSON.stringify(result, null, 2);
	},
};

export const updateStepTool = {
	name: "fizzy_update_step",
	description: `Update a step's content or completion status.

Mark a step done or modify its text.

**When to use:**
1. Mark a subtask as complete
2. Fix step wording or uncheck an accidentally completed step

**Arguments:** \`account_slug\` (optional), \`card_number\` (required), \`step_id\` (required), \`content\` (optional — new text), \`completed\` (optional — true/false)

**Returns:** JSON with \`id\`, \`content\`, \`completed\` status.
Example: \`{"id": "abc123", "content": "Review PR", "completed": true}\`

**Related:** Get step IDs from \`fizzy_get_card\` (includes step details) or create with \`fizzy_create_step\`.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if omitted."),
		card_number: z.number().describe("Card number the step belongs to."),
		step_id: z.string().describe("Step ID to update. Get from fizzy_get_card."),
		content: z.string().optional().describe("New step content text."),
		completed: z
			.boolean()
			.optional()
			.describe("Set true to mark complete, false to uncheck."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		step_id: string;
		content?: string;
		completed?: boolean;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.updateStep(
			slug,
			args.card_number,
			args.step_id,
			{
				content: args.content,
				completed: args.completed,
			},
		);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Step",
				resourceId: args.step_id,
				container: `card #${args.card_number}`,
			});
		}
		return JSON.stringify(formatStep(result.value), null, 2);
	},
};

export const deleteStepTool = {
	name: "fizzy_delete_step",
	description: `Delete a step from a card.

Remove a checklist item permanently.

**When to use:**
1. Step is no longer relevant to the task
2. Consolidating or reorganizing checklist items

**Don't use when:** You want to preserve history — consider marking complete instead.

**Arguments:** \`account_slug\` (optional), \`card_number\` (required), \`step_id\` (required)

**Returns:** Confirmation message.

**Related:** Get step IDs from \`fizzy_get_card\`. Consider \`fizzy_update_step\` with \`completed: true\` to preserve history.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if omitted."),
		card_number: z.number().describe("Card number the step belongs to."),
		step_id: z.string().describe("Step ID to delete. Get from fizzy_get_card."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		step_id: string;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();
		const result = await client.deleteStep(
			slug,
			args.card_number,
			args.step_id,
		);
		if (isErr(result)) {
			throw toUserError(result.error, {
				resourceType: "Step",
				resourceId: args.step_id,
				container: `card #${args.card_number}`,
			});
		}
		return `Step ${args.step_id} deleted from card #${args.card_number}.`;
	},
};
