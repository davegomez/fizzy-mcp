import { readFile } from "node:fs/promises";
import { UserError } from "fastmcp";
import { z } from "zod";
import {
	createDirectUpload,
	embedAttachment,
	uploadFile,
} from "../client/upload.js";
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

export const attachFileTool = {
	name: "fizzy_attach_file",
	description:
		"Upload a file and return HTML to embed in a rich text field. Reads file from disk, uploads to Fizzy storage, returns action-text-attachment HTML. Max 50MB.",
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug. Uses default if not provided."),
		file_path: z.string().describe("Absolute path to file on disk."),
		content_type: z
			.string()
			.describe("MIME type (e.g., image/png, application/pdf)."),
	}),
	execute: async (args: {
		account_slug?: string;
		file_path: string;
		content_type: string;
	}): Promise<string> => {
		const slug = resolveAccount(args.account_slug);

		// Step 1: Create direct upload (validates file exists, size < 50MB)
		const uploadResult = await createDirectUpload(
			slug,
			args.file_path,
			args.content_type,
		);
		if (isErr(uploadResult)) {
			const error = uploadResult.error;
			throw new UserError(error.message);
		}

		const { signed_id, direct_upload } = uploadResult.value;

		// Step 2: Read file and upload to signed URL
		const fileContent = await readFile(args.file_path);
		const uploadFileResult = await uploadFile(
			direct_upload.url,
			direct_upload.headers,
			fileContent,
		);
		if (isErr(uploadFileResult)) {
			throw new UserError(uploadFileResult.error.message);
		}

		// Step 3: Return embeddable HTML
		const html = embedAttachment(signed_id);
		return JSON.stringify(
			{
				signed_id,
				html,
				usage:
					"Include the html value in any rich text field (description, comment body).",
			},
			null,
			2,
		);
	},
};
