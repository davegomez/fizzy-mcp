import { UserError } from "fastmcp";
import { z } from "zod";
import { getFizzyClient, toUserError } from "../client/index.js";
import { getDefaultAccount } from "../state/session.js";
import { isErr } from "../types/result.js";

function resolveAccount(accountSlug?: string): string {
	const slug = (accountSlug || getDefaultAccount())?.replace(/^\//, "");
	if (!slug) {
		throw new UserError(
			"No account specified and no default set. Use fizzy_default_account first.",
		);
	}
	return slug;
}

export const completeStepTool = {
	name: "fizzy_complete_step",
	description: `Mark a step as complete on a card.

Find a step by content substring or position and mark it done.

**When to use:**
- Mark a checklist item complete
- Complete a step without knowing its ID

**Arguments:**
- \`account_slug\` (optional): Uses session default if omitted
- \`card_number\` (required): Card number containing the step
- \`step\` (required): Content substring to match OR 1-based index (e.g., 1 for first step)

**Returns:** JSON with completed step \`id\`, \`content\`, \`completed\` status.

**Examples:**
- By content: \`{card_number: 42, step: "Review PR"}\` — matches "Review PR changes"
- By index: \`{card_number: 42, step: 1}\` — completes first step`,
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
			.describe("Step to complete: content substring or 1-based index."),
	}),
	execute: async (args: {
		account_slug?: string;
		card_number: number;
		step: string | number;
	}) => {
		const slug = resolveAccount(args.account_slug);
		const client = getFizzyClient();

		// Fetch steps for the card
		const stepsResult = await client.listSteps(slug, args.card_number);
		if (isErr(stepsResult)) {
			throw toUserError(stepsResult.error, {
				resourceType: "Step",
				container: `card #${args.card_number}`,
			});
		}

		const steps = stepsResult.value;
		if (steps.length === 0) {
			throw new UserError(`Card #${args.card_number} has no steps.`);
		}

		let targetStep: (typeof steps)[number] | undefined;

		if (typeof args.step === "number") {
			// Match by 1-based index
			const index = args.step - 1;
			if (index < 0 || index >= steps.length) {
				throw new UserError(
					`Step index ${args.step} out of range. Card has ${steps.length} step(s).`,
				);
			}
			targetStep = steps[index];
		} else {
			// Match by content substring (case-insensitive)
			const searchTerm = args.step.toLowerCase();
			const matches = steps.filter((s) =>
				s.content.toLowerCase().includes(searchTerm),
			);

			if (matches.length === 0) {
				const stepList = steps
					.map((s, i) => `${i + 1}. ${s.content}`)
					.join("\n");
				throw new UserError(
					`No step matches "${args.step}". Available steps:\n${stepList}`,
				);
			}

			if (matches.length > 1) {
				const matchList = matches.map((s) => `- ${s.content}`).join("\n");
				throw new UserError(
					`Multiple steps match "${args.step}". Be more specific:\n${matchList}`,
				);
			}

			targetStep = matches[0];
		}

		if (!targetStep) {
			throw new UserError("Could not find matching step.");
		}

		if (targetStep.completed) {
			return JSON.stringify(
				{
					id: targetStep.id,
					content: targetStep.content,
					completed: true,
					note: "Step was already completed.",
				},
				null,
				2,
			);
		}

		// Mark step as completed
		const updateResult = await client.updateStep(
			slug,
			args.card_number,
			targetStep.id,
			{ completed: true },
		);
		if (isErr(updateResult)) {
			throw toUserError(updateResult.error, {
				resourceType: "Step",
				resourceId: targetStep.id,
				container: `card #${args.card_number}`,
			});
		}

		return JSON.stringify(
			{
				id: updateResult.value.id,
				content: updateResult.value.content,
				completed: updateResult.value.completed,
			},
			null,
			2,
		);
	},
};
