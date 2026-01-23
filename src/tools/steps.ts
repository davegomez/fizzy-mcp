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
	description:
		"Create one or more checklist steps on a card. Batch creation supported - steps are created in order. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number to add steps to."),
		steps: z
			.array(z.string())
			.min(1)
			.describe("Step content strings to create."),
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
			throw toUserError(firstError);
		}

		return JSON.stringify(result, null, 2);
	},
};

export const updateStepTool = {
	name: "fizzy_update_step",
	description:
		"Update a step's content and/or completion status. Can toggle completion or change content. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number the step belongs to."),
		step_id: z.string().describe("Step ID to update."),
		content: z.string().optional().describe("New step content."),
		completed: z
			.boolean()
			.optional()
			.describe("Mark step as completed or not."),
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
			throw toUserError(result.error);
		}
		return JSON.stringify(formatStep(result.value), null, 2);
	},
};

export const deleteStepTool = {
	name: "fizzy_delete_step",
	description: "Delete a step from a card. Uses default account if set.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		card_number: z.number().describe("Card number the step belongs to."),
		step_id: z.string().describe("Step ID to delete."),
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
			throw toUserError(result.error);
		}
		return `Step ${args.step_id} deleted from card #${args.card_number}.`;
	},
};
