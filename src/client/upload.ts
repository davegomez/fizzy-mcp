import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { err, ok, type Result } from "../types/result.js";
import type { FizzyApiError } from "./errors.js";
import { getFizzyClient } from "./fizzy.js";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface DirectUploadResponse {
	signed_id: string;
	direct_upload: {
		url: string;
		headers: Record<string, string>;
	};
}

/**
 * Compute MD5 checksum of data, base64-encoded (required by Fizzy API)
 */
export function computeChecksum(data: Buffer): string {
	return createHash("md5").update(data).digest("base64");
}

/**
 * Escape HTML characters to prevent XSS
 */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Generate action-text-attachment HTML for embedding signed_id in rich text
 */
export function embedAttachment(signedId: string): string {
	const escapedId = escapeHtml(signedId);
	return `<action-text-attachment sgid="${escapedId}"></action-text-attachment>`;
}

/**
 * Create a direct upload to get signed URL and upload credentials
 */
export async function createDirectUpload(
	accountSlug: string,
	filePath: string,
	contentType: string,
): Promise<Result<DirectUploadResponse, FizzyApiError | Error>> {
	try {
		const fileStats = await stat(filePath);

		if (fileStats.size > MAX_FILE_SIZE) {
			return err(
				new Error(
					`File size ${fileStats.size} exceeds maximum allowed 50MB (${MAX_FILE_SIZE} bytes)`,
				),
			);
		}

		const fileData = await readFile(filePath);
		const checksum = computeChecksum(fileData);
		const filename = basename(filePath);

		const client = getFizzyClient();
		const result = await client.request<DirectUploadResponse>(
			"POST",
			`/${accountSlug}/rails/active_storage/direct_uploads`,
			{
				body: {
					blob: {
						filename,
						byte_size: fileStats.size,
						checksum,
						content_type: contentType,
					},
				},
			},
		);

		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	} catch (error) {
		if (error instanceof Error) {
			return err(error);
		}
		return err(new Error(String(error)));
	}
}

/**
 * Upload file content to signed URL
 */
export async function uploadFile(
	uploadUrl: string,
	headers: Record<string, string>,
	fileContent: Buffer,
): Promise<Result<void, Error>> {
	try {
		const response = await fetch(uploadUrl, {
			method: "PUT",
			headers,
			body: fileContent,
		});

		if (!response.ok) {
			return err(new Error(`Upload failed: ${response.status}`));
		}
		return ok(undefined);
	} catch (error) {
		if (error instanceof Error) {
			return err(error);
		}
		return err(new Error(String(error)));
	}
}
