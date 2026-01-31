import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import type { Step } from "../schemas/steps.js";
import { resolveAccount } from "../state/account-resolver.js";
import { isErr } from "../types/result.js";

export const stepTool = {
	name: "fizzy_step",
	description: `Create, complete, update, uncomplete, or delete a step on a card.

**Mode detection:**
- \`step\` absent → CREATE (requires \`content\`)
- \`step\` present, no other params → COMPLETE (default action)
- \`step\` + \`content\` → UPDATE content
- \`step\` + \`completed: false\` → UNCOMPLETE
- \`step\` + \`delete: true\` → DELETE

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`card_number\` (required): Card number containing the step
- \`step\` (optional): Content substring to match OR 1-based index to identify existing step
- \`content\` (optional): Step text for create or update
- \`completed\` (optional): Set completion state (true or false)
- \`delete\` (optional): Delete the step

**Returns:** JSON with step \`id\`, \`content\`, \`completed\` status.

**Examples:**
- Create: \`{card_number: 42, content: "Write tests"}\`
- Complete: \`{card_number: 42, step: "Write tests"}\`
- Uncomplete: \`{card_number: 42, step: 1, completed: false}\`
- Update: \`{card_number: 42, step: 1, content: "Write unit tests"}\`
- Delete: \`{card_number: 42, step: "Write tests", delete: true}\``,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if omitted."),
		card_number: z.number().describe("Card number containing the step."),
		step: z
			.union([
				z.string().describe("Content substring to match"),
				z.number().describe("1-based step index"),
			])
			.optional()
			.describe(
				"Step to act on: content substring or 1-based index. Omit to create.",
			),
		content: z.string().optional().describe("Step text for create or update."),
		completed: z.boolean().optional().describe("Set completion state."),
		delete: z.boolean().optional().describe("Delete the step."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		step?: string | number;
		content?: string;
		completed?: boolean;
		delete?: boolean;
	}) => {
		const slug = await resolveAccount(args.account_slug);
		const client = getFizzyClient();

		// CREATE mode: no step identifier
		if (args.step === undefined) {
			if (!args.content) {
				throw new UserError("Create mode requires content. Provide step text.");
			}
			const createResult = await client.createStep(slug, args.card_number, {
				content: args.content,
				completed: args.completed,
			});
			if (isErr(createResult)) {
				throw toUserError(createResult.error, {
					resourceType: "Step",
					container: `card #${args.card_number}`,
				});
			}
			return JSON.stringify(createResult.value, null, 2);
		}

		// All other modes require finding the step
		const targetStep = await findStep(slug, args.card_number, args.step);

		// DELETE mode
		if (args.delete) {
			const deleteResult = await client.deleteStep(
				slug,
				args.card_number,
				targetStep.id,
			);
			if (isErr(deleteResult)) {
				throw toUserError(deleteResult.error, {
					resourceType: "Step",
					resourceId: targetStep.id,
					container: `card #${args.card_number}`,
				});
			}
			return JSON.stringify(
				{
					id: targetStep.id,
					content: targetStep.content,
					deleted: true,
				},
				null,
				2,
			);
		}

		// UPDATE or COMPLETE/UNCOMPLETE mode
		const hasContentUpdate = args.content !== undefined;
		const hasCompletedUpdate = args.completed !== undefined;

		// Default action when only step is provided: complete
		const completed = hasCompletedUpdate
			? args.completed
			: !hasContentUpdate
				? true
				: undefined;

		// Check idempotency for pure completion changes
		if (
			!hasContentUpdate &&
			completed !== undefined &&
			targetStep.completed === completed
		) {
			return JSON.stringify(
				{
					id: targetStep.id,
					content: targetStep.content,
					completed: targetStep.completed,
					note: completed
						? "Step was already completed."
						: "Step was already incomplete.",
				},
				null,
				2,
			);
		}

		const updateData: { content?: string; completed?: boolean } = {};
		if (hasContentUpdate) updateData.content = args.content;
		if (completed !== undefined) updateData.completed = completed;

		const updateResult = await client.updateStep(
			slug,
			args.card_number,
			targetStep.id,
			updateData,
		);
		if (isErr(updateResult)) {
			throw toUserError(updateResult.error, {
				resourceType: "Step",
				resourceId: targetStep.id,
				container: `card #${args.card_number}`,
			});
		}

		return JSON.stringify(updateResult.value, null, 2);
	},
};

async function findStep(
	slug: string,
	cardNumber: number,
	step: string | number,
): Promise<Step> {
	const client = getFizzyClient();

	const cardResult = await client.getCard(slug, cardNumber);
	if (isErr(cardResult)) {
		throw toUserError(cardResult.error, {
			resourceType: "Card",
			resourceId: `#${cardNumber}`,
		});
	}

	const steps = cardResult.value.steps;
	if (!steps || steps.length === 0) {
		throw new UserError(`Card #${cardNumber} has no steps.`);
	}

	if (typeof step === "number") {
		const index = step - 1;
		if (index < 0 || index >= steps.length) {
			throw new UserError(
				`Step index ${step} out of range. Card has ${steps.length} step(s).`,
			);
		}
		// biome-ignore lint: index is bounds-checked above
		return steps[index]!;
	}

	const searchTerm = step.toLowerCase();
	const matches = steps.filter((s) =>
		s.content.toLowerCase().includes(searchTerm),
	);

	if (matches.length === 0) {
		const stepList = steps.map((s, i) => `${i + 1}. ${s.content}`).join("\n");
		throw new UserError(
			`No step matches "${step}". Available steps:\n${stepList}`,
		);
	}

	if (matches.length > 1) {
		const matchList = matches.map((s) => `- ${s.content}`).join("\n");
		throw new UserError(
			`Multiple steps match "${step}". Be more specific:\n${matchList}`,
		);
	}

	// biome-ignore lint: length is exactly 1 after checks above
	return matches[0]!;
}
