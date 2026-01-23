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
	description: `Upload a file and get HTML to embed in rich text fields.
Attach images, PDFs, or other files to card descriptions or comments.

**When to use:**
- Adding a screenshot to a card description
- Attaching a document to a comment

**Don't use when:** You need to link to an external URL — just include the URL in markdown.

**Arguments:**
- \`account_slug\` (optional) — uses default if not provided
- \`file_path\` (required) — absolute path to file on disk
- \`content_type\` (required) — MIME type like \`image/png\`, \`application/pdf\`, \`image/jpeg\`

**Returns:** JSON with \`signed_id\` (internal reference), \`html\` (action-text-attachment HTML to embed), \`usage\` (instructions).
Example: \`{"signed_id": "abc123", "html": "<action-text-attachment sgid=\\"...\\" content-type=\\"image/png\\"></action-text-attachment>", "usage": "Include the html value..."}\`

**Related:** Include the returned \`html\` verbatim in any rich text field (card description, comment body) to display the attachment. Max file size: 50MB.`,
	parameters: z.object({
		account_slug: z
			.string()
			.optional()
			.describe("Account slug (uses default if omitted)."),
		file_path: z.string().describe("Absolute path to file on disk (required)."),
		content_type: z
			.string()
			.describe(
				"MIME type — e.g., image/png, image/jpeg, application/pdf (required).",
			),
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
