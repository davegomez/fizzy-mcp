import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import * as uploadClient from "../client/upload.js";
import { clearDefaultAccount, setDefaultAccount } from "../state/session.js";
import { err, ok } from "../types/result.js";
import { attachFileTool } from "./upload.js";

describe("attachFileTool", () => {
	const originalEnv = process.env;
	const testDir = join(tmpdir(), `fizzy-mcp-upload-test-${Date.now()}`);

	beforeAll(async () => {
		await mkdir(testDir, { recursive: true });
	});

	afterAll(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	beforeEach(() => {
		vi.restoreAllMocks();
		clearDefaultAccount();
		process.env = { ...originalEnv };
		process.env.FIZZY_ACCESS_TOKEN = "test-token";
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	test("should upload file and return embed HTML", async () => {
		const testFile = join(testDir, "test-image.png");
		await writeFile(testFile, "fake image content");

		vi.spyOn(uploadClient, "createDirectUpload").mockResolvedValue(
			ok({
				signed_id: "signed_abc123",
				direct_upload: {
					url: "https://storage.example.com/upload",
					headers: { "Content-Type": "image/png" },
				},
			}),
		);
		vi.spyOn(uploadClient, "uploadFile").mockResolvedValue(ok(undefined));

		setDefaultAccount("test-account");
		const result = await attachFileTool.execute({
			file_path: testFile,
			content_type: "image/png",
		});

		const parsed = JSON.parse(result);
		expect(parsed.signed_id).toBe("signed_abc123");
		expect(parsed.html).toBe(
			'<action-text-attachment sgid="signed_abc123"></action-text-attachment>',
		);
		expect(parsed.usage).toContain("rich text field");
	});

	test("should throw UserError when no account and no default", async () => {
		const testFile = join(testDir, "test.txt");
		await writeFile(testFile, "content");

		await expect(
			attachFileTool.execute({
				file_path: testFile,
				content_type: "text/plain",
			}),
		).rejects.toThrow("No account specified and no default set");
	});

	test("should throw UserError when createDirectUpload fails", async () => {
		const testFile = join(testDir, "test-fail.txt");
		await writeFile(testFile, "content");

		vi.spyOn(uploadClient, "createDirectUpload").mockResolvedValue(
			err(new Error("File size exceeds maximum")),
		);

		setDefaultAccount("test-account");
		await expect(
			attachFileTool.execute({
				file_path: testFile,
				content_type: "text/plain",
			}),
		).rejects.toThrow("File size exceeds maximum");
	});

	test("should throw UserError when uploadFile fails", async () => {
		const testFile = join(testDir, "test-upload-fail.txt");
		await writeFile(testFile, "content");

		vi.spyOn(uploadClient, "createDirectUpload").mockResolvedValue(
			ok({
				signed_id: "signed_xyz",
				direct_upload: {
					url: "https://storage.example.com/upload",
					headers: {},
				},
			}),
		);
		vi.spyOn(uploadClient, "uploadFile").mockResolvedValue(
			err(new Error("Upload failed: 500")),
		);

		setDefaultAccount("test-account");
		await expect(
			attachFileTool.execute({
				file_path: testFile,
				content_type: "text/plain",
			}),
		).rejects.toThrow("Upload failed: 500");
	});

	test("should use account_slug from args over default", async () => {
		const testFile = join(testDir, "test-account.txt");
		await writeFile(testFile, "content");

		const createDirectUploadSpy = vi
			.spyOn(uploadClient, "createDirectUpload")
			.mockResolvedValue(
				ok({
					signed_id: "signed_123",
					direct_upload: {
						url: "https://storage.example.com/upload",
						headers: {},
					},
				}),
			);
		vi.spyOn(uploadClient, "uploadFile").mockResolvedValue(ok(undefined));

		setDefaultAccount("default-account");
		await attachFileTool.execute({
			account_slug: "explicit-account",
			file_path: testFile,
			content_type: "text/plain",
		});

		expect(createDirectUploadSpy).toHaveBeenCalledWith(
			"explicit-account",
			testFile,
			"text/plain",
		);
	});

	test("should strip leading slash from account_slug", async () => {
		const testFile = join(testDir, "test-slash.txt");
		await writeFile(testFile, "content");

		const createDirectUploadSpy = vi
			.spyOn(uploadClient, "createDirectUpload")
			.mockResolvedValue(
				ok({
					signed_id: "signed_456",
					direct_upload: {
						url: "https://storage.example.com/upload",
						headers: {},
					},
				}),
			);
		vi.spyOn(uploadClient, "uploadFile").mockResolvedValue(ok(undefined));

		await attachFileTool.execute({
			account_slug: "/my-account",
			file_path: testFile,
			content_type: "text/plain",
		});

		expect(createDirectUploadSpy).toHaveBeenCalledWith(
			"my-account",
			testFile,
			"text/plain",
		);
	});
});
