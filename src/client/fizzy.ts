import parseLinkHeader from "parse-link-header";
import { ENV_BASE_URL, ENV_TOKEN, getToken } from "../config.js";
import type { Board } from "../schemas/boards.js";
import type { Card, CardFilters } from "../schemas/cards.js";
import type { Column } from "../schemas/columns.js";
import type { Comment } from "../schemas/comments.js";
import type { PaginatedResult } from "../schemas/pagination.js";
import type { Step } from "../schemas/steps.js";
import type { Tag } from "../schemas/tags.js";
import { err, ok, type Result } from "../types/result.js";
import {
	AuthenticationError,
	FizzyApiError,
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	ValidationError,
} from "./errors.js";
import { markdownToHtml } from "./markdown.js";
import { decodeCursor, encodeCursor } from "./pagination.js";

export interface PaginationOptions {
	limit?: number;
	cursor?: string;
}

const DEFAULT_BASE_URL = "https://app.fizzy.do";

export interface IdentityResponse {
	accounts: Array<{
		id: string;
		name: string;
		slug: string;
		created_at: string;
		user: {
			id: string;
			name: string;
			role: "owner" | "member";
			active: boolean;
			email_address: string;
			created_at: string;
			url: string;
		};
	}>;
}

export interface RequestResult<T> {
	data: T;
	linkHeader?: string;
	etag?: string;
}

export interface DirectUploadResponse {
	signed_id: string;
	direct_upload: {
		url: string;
		headers: Record<string, string>;
	};
}

export class FizzyClient {
	readonly baseUrl: string;
	private readonly token: string;

	constructor() {
		const token = getToken();
		if (!token) {
			throw new Error(`${ENV_TOKEN} environment variable is required`);
		}
		this.token = token;
		this.baseUrl = process.env[ENV_BASE_URL] || DEFAULT_BASE_URL;
	}

	async request<T>(
		method: string,
		path: string,
		options?: { params?: URLSearchParams; body?: unknown },
	): Promise<Result<RequestResult<T>, FizzyApiError>> {
		let url = `${this.baseUrl}${path}`;
		if (options?.params) {
			url += `?${options.params.toString()}`;
		}

		const headers: Record<string, string> = {
			Authorization: `Bearer ${this.token}`,
			Accept: "application/json",
		};
		if (options?.body) {
			headers["Content-Type"] = "application/json";
		}

		const response = await fetch(url, {
			method,
			headers,
			body: options?.body ? JSON.stringify(options.body) : undefined,
		});

		if (!response.ok) {
			return err(await this.handleError(response));
		}

		if (response.status === 204) {
			return ok({
				data: undefined as T,
				linkHeader: response.headers.get("Link") ?? undefined,
				etag: response.headers.get("ETag") ?? undefined,
			});
		}

		// 201 Created with Location header but no body - follow the Location
		if (response.status === 201) {
			const location = response.headers.get("Location");
			if (location) {
				// Resolve relative URLs against base URL
				const absoluteUrl = new URL(location, this.baseUrl).toString();
				const followResponse = await fetch(absoluteUrl, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${this.token}`,
						Accept: "application/json",
					},
				});
				if (!followResponse.ok) {
					return err(await this.handleError(followResponse));
				}
				const data = (await followResponse.json()) as T;
				return ok({
					data,
					linkHeader: followResponse.headers.get("Link") ?? undefined,
					etag: followResponse.headers.get("ETag") ?? undefined,
				});
			}
		}

		const data = (await response.json()) as T;
		return ok({
			data,
			linkHeader: response.headers.get("Link") ?? undefined,
			etag: response.headers.get("ETag") ?? undefined,
		});
	}

	private async handleError(response: Response): Promise<FizzyApiError> {
		const status = response.status;
		let details: Record<string, string[]> | undefined;

		try {
			const body: unknown = await response.json();
			if (typeof body === "object" && body !== null) {
				details = body as Record<string, string[]>;
			}
		} catch {
			// Response may not have JSON body
		}

		switch (status) {
			case 401:
				return new AuthenticationError();
			case 403:
				return new ForbiddenError();
			case 404:
				return new NotFoundError();
			case 422:
				return new ValidationError(details);
			case 429:
				return new RateLimitError();
			default:
				return new FizzyApiError(status, `API error: ${status}`);
		}
	}

	async whoami(): Promise<Result<IdentityResponse, FizzyApiError>> {
		const result = await this.request<IdentityResponse>("GET", "/my/identity");
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async listBoards(
		accountSlug: string,
		options?: PaginationOptions,
	): Promise<Result<PaginatedResult<Board>, FizzyApiError>> {
		let path: string;
		if (options?.cursor) {
			const decodedUrl = decodeCursor(options.cursor);
			if (!decodedUrl) {
				return err(
					new ValidationError({ cursor: ["Invalid pagination cursor"] }),
				);
			}
			path = decodedUrl.replace(this.baseUrl, "");
		} else {
			path = `/${accountSlug}/boards`;
		}

		const result = await this.request<Board[]>("GET", path);
		if (!result.ok) {
			return result;
		}

		const items = result.value.data;
		const links = result.value.linkHeader
			? parseLinkHeader(result.value.linkHeader)
			: null;
		const nextUrl = links?.next?.url;

		return ok({
			items,
			pagination: {
				returned: items.length,
				has_more: !!nextUrl,
				...(nextUrl && { next_cursor: encodeCursor(nextUrl) }),
			},
		});
	}

	async getBoard(
		accountSlug: string,
		boardId: string,
	): Promise<Result<Board, FizzyApiError>> {
		const result = await this.request<Board>(
			"GET",
			`/${accountSlug}/boards/${boardId}`,
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async createBoard(
		accountSlug: string,
		data: { name: string; description?: string },
	): Promise<Result<Board, FizzyApiError>> {
		const body: { name: string; description?: string } = { name: data.name };
		if (data.description) {
			body.description = markdownToHtml(data.description);
		}
		const result = await this.request<Board>("POST", `/${accountSlug}/boards`, {
			body: { board: body },
		});
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async updateBoard(
		accountSlug: string,
		boardId: string,
		data: { name?: string; description?: string },
	): Promise<Result<Board, FizzyApiError>> {
		const body: { name?: string; description?: string } = {};
		if (data.name !== undefined) {
			body.name = data.name;
		}
		if (data.description !== undefined) {
			body.description = markdownToHtml(data.description);
		}
		const result = await this.request<Board>(
			"PUT",
			`/${accountSlug}/boards/${boardId}`,
			{ body: { board: body } },
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async listTags(
		accountSlug: string,
		options?: PaginationOptions,
	): Promise<Result<PaginatedResult<Tag>, FizzyApiError>> {
		let path: string;
		if (options?.cursor) {
			const decodedUrl = decodeCursor(options.cursor);
			if (!decodedUrl) {
				return err(
					new ValidationError({ cursor: ["Invalid pagination cursor"] }),
				);
			}
			path = decodedUrl.replace(this.baseUrl, "");
		} else {
			path = `/${accountSlug}/tags`;
		}

		const result = await this.request<Tag[]>("GET", path);
		if (!result.ok) {
			return result;
		}

		const items = result.value.data;
		const links = result.value.linkHeader
			? parseLinkHeader(result.value.linkHeader)
			: null;
		const nextUrl = links?.next?.url;

		return ok({
			items,
			pagination: {
				returned: items.length,
				has_more: !!nextUrl,
				...(nextUrl && { next_cursor: encodeCursor(nextUrl) }),
			},
		});
	}

	async listColumns(
		accountSlug: string,
		boardId: string,
		options?: PaginationOptions,
	): Promise<Result<PaginatedResult<Column>, FizzyApiError>> {
		let path: string;
		if (options?.cursor) {
			const decodedUrl = decodeCursor(options.cursor);
			if (!decodedUrl) {
				return err(
					new ValidationError({ cursor: ["Invalid pagination cursor"] }),
				);
			}
			path = decodedUrl.replace(this.baseUrl, "");
		} else {
			path = `/${accountSlug}/boards/${boardId}/columns`;
		}

		const result = await this.request<Column[]>("GET", path);
		if (!result.ok) {
			return result;
		}

		const items = result.value.data;
		const links = result.value.linkHeader
			? parseLinkHeader(result.value.linkHeader)
			: null;
		const nextUrl = links?.next?.url;

		return ok({
			items,
			pagination: {
				returned: items.length,
				has_more: !!nextUrl,
				...(nextUrl && { next_cursor: encodeCursor(nextUrl) }),
			},
		});
	}

	async getColumn(
		accountSlug: string,
		boardId: string,
		columnId: string,
	): Promise<Result<Column, FizzyApiError>> {
		const result = await this.request<Column>(
			"GET",
			`/${accountSlug}/boards/${boardId}/columns/${columnId}`,
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async createColumn(
		accountSlug: string,
		boardId: string,
		data: { name: string; color?: string },
	): Promise<Result<Column, FizzyApiError>> {
		const body: { name: string; color?: string } = { name: data.name };
		if (data.color) {
			body.color = data.color;
		}
		const result = await this.request<Column>(
			"POST",
			`/${accountSlug}/boards/${boardId}/columns`,
			{ body: { column: body } },
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async updateColumn(
		accountSlug: string,
		boardId: string,
		columnId: string,
		data: { name?: string; color?: string },
	): Promise<Result<Column, FizzyApiError>> {
		const body: { name?: string; color?: string } = {};
		if (data.name !== undefined) {
			body.name = data.name;
		}
		if (data.color !== undefined) {
			body.color = data.color;
		}
		const result = await this.request<Column>(
			"PUT",
			`/${accountSlug}/boards/${boardId}/columns/${columnId}`,
			{ body: { column: body } },
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async deleteColumn(
		accountSlug: string,
		boardId: string,
		columnId: string,
	): Promise<Result<void, FizzyApiError>> {
		const result = await this.request<void>(
			"DELETE",
			`/${accountSlug}/boards/${boardId}/columns/${columnId}`,
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async listCards(
		accountSlug: string,
		filters?: CardFilters,
		options?: PaginationOptions,
	): Promise<Result<PaginatedResult<Card>, FizzyApiError>> {
		let path: string;
		if (options?.cursor) {
			// Cursor encodes full URL including filters, so ignore filters param
			const decodedUrl = decodeCursor(options.cursor);
			if (!decodedUrl) {
				return err(
					new ValidationError({ cursor: ["Invalid pagination cursor"] }),
				);
			}
			path = decodedUrl.replace(this.baseUrl, "");
		} else {
			const params = new URLSearchParams();
			for (const id of filters?.board_ids ?? []) {
				params.append("board_ids[]", id);
			}
			if (filters?.indexed_by) params.set("indexed_by", filters.indexed_by);
			for (const id of filters?.tag_ids ?? []) {
				params.append("tag_ids[]", id);
			}
			for (const id of filters?.assignee_ids ?? []) {
				params.append("assignee_ids[]", id);
			}
			if (filters?.sorted_by) params.set("sorted_by", filters.sorted_by);
			for (const term of filters?.terms ?? []) {
				params.append("terms[]", term);
			}
			const queryString = params.toString();
			path = `/${accountSlug}/cards${queryString ? `?${queryString}` : ""}`;
		}

		const result = await this.request<Card[]>("GET", path);
		if (!result.ok) {
			return result;
		}

		const items = result.value.data;
		const links = result.value.linkHeader
			? parseLinkHeader(result.value.linkHeader)
			: null;
		const nextUrl = links?.next?.url;

		return ok({
			items,
			pagination: {
				returned: items.length,
				has_more: !!nextUrl,
				...(nextUrl && { next_cursor: encodeCursor(nextUrl) }),
			},
		});
	}

	async getCard(
		accountSlug: string,
		cardNumber: number,
	): Promise<Result<Card, FizzyApiError>> {
		const result = await this.request<Card>(
			"GET",
			`/${accountSlug}/cards/${cardNumber}`,
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async getCardById(
		accountSlug: string,
		cardId: string,
	): Promise<Result<Card, FizzyApiError>> {
		const result = await this.request<Card>(
			"GET",
			`/${accountSlug}/cards/${cardId}`,
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async createCard(
		accountSlug: string,
		boardId: string,
		data: { title: string; description?: string },
	): Promise<Result<Card, FizzyApiError>> {
		const body: { title: string; description?: string } = { title: data.title };
		if (data.description) {
			body.description = markdownToHtml(data.description);
		}
		const result = await this.request<Card>(
			"POST",
			`/${accountSlug}/boards/${boardId}/cards`,
			{ body: { card: body } },
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async updateCard(
		accountSlug: string,
		cardNumber: number,
		data: { title?: string; description?: string },
	): Promise<Result<Card, FizzyApiError>> {
		const body: { title?: string; description?: string } = {};
		if (data.title !== undefined) {
			body.title = data.title;
		}
		if (data.description !== undefined) {
			body.description = markdownToHtml(data.description);
		}
		const result = await this.request<Card>(
			"PUT",
			`/${accountSlug}/cards/${cardNumber}`,
			{ body: { card: body } },
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async deleteCard(
		accountSlug: string,
		cardNumber: number,
	): Promise<Result<void, FizzyApiError>> {
		const result = await this.request<void>(
			"DELETE",
			`/${accountSlug}/cards/${cardNumber}`,
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async closeCard(
		accountSlug: string,
		cardNumber: number,
	): Promise<Result<void, FizzyApiError>> {
		const result = await this.request<void>(
			"POST",
			`/${accountSlug}/cards/${cardNumber}/closure`,
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async reopenCard(
		accountSlug: string,
		cardNumber: number,
	): Promise<Result<void, FizzyApiError>> {
		// DELETE on /closure removes the closed state, reopening the card
		const result = await this.request<void>(
			"DELETE",
			`/${accountSlug}/cards/${cardNumber}/closure`,
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async triageCard(
		accountSlug: string,
		cardNumber: number,
		columnId: string,
		position?: "top" | "bottom",
	): Promise<Result<void, FizzyApiError>> {
		const body: { column_id: string; position?: string } = {
			column_id: columnId,
		};
		if (position) {
			body.position = position;
		}
		const result = await this.request<void>(
			"POST",
			`/${accountSlug}/cards/${cardNumber}/triage`,
			{ body },
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async unTriageCard(
		accountSlug: string,
		cardNumber: number,
	): Promise<Result<void, FizzyApiError>> {
		// DELETE on /triage removes column assignment, returning card to inbox
		const result = await this.request<void>(
			"DELETE",
			`/${accountSlug}/cards/${cardNumber}/triage`,
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async notNowCard(
		accountSlug: string,
		cardNumber: number,
	): Promise<Result<void, FizzyApiError>> {
		const result = await this.request<void>(
			"POST",
			`/${accountSlug}/cards/${cardNumber}/not_now`,
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async toggleTag(
		accountSlug: string,
		cardNumber: number,
		tagTitle: string,
	): Promise<Result<void, FizzyApiError>> {
		const result = await this.request<void>(
			"POST",
			`/${accountSlug}/cards/${cardNumber}/taggings`,
			{ body: { tag_title: tagTitle } },
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async toggleAssignee(
		accountSlug: string,
		cardNumber: number,
		userId: string,
	): Promise<Result<void, FizzyApiError>> {
		const result = await this.request<void>(
			"POST",
			`/${accountSlug}/cards/${cardNumber}/assignees`,
			{ body: { user_id: userId } },
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async listComments(
		accountSlug: string,
		cardNumber: number,
		options?: PaginationOptions,
	): Promise<Result<PaginatedResult<Comment>, FizzyApiError>> {
		// First page reversed for newest-first display; subsequent pages maintain API order
		const isFirstPage = !options?.cursor;

		let path: string;
		if (options?.cursor) {
			const decodedUrl = decodeCursor(options.cursor);
			if (!decodedUrl) {
				return err(
					new ValidationError({ cursor: ["Invalid pagination cursor"] }),
				);
			}
			path = decodedUrl.replace(this.baseUrl, "");
		} else {
			path = `/${accountSlug}/cards/${cardNumber}/comments`;
		}

		const result = await this.request<Comment[]>("GET", path);
		if (!result.ok) {
			return result;
		}

		const items = isFirstPage ? result.value.data.reverse() : result.value.data;
		const links = result.value.linkHeader
			? parseLinkHeader(result.value.linkHeader)
			: null;
		const nextUrl = links?.next?.url;

		return ok({
			items,
			pagination: {
				returned: items.length,
				has_more: !!nextUrl,
				...(nextUrl && { next_cursor: encodeCursor(nextUrl) }),
			},
		});
	}

	async createComment(
		accountSlug: string,
		cardNumber: number,
		body: string,
	): Promise<Result<Comment, FizzyApiError>> {
		const html = markdownToHtml(body);
		const result = await this.request<Comment>(
			"POST",
			`/${accountSlug}/cards/${cardNumber}/comments`,
			{ body: { comment: { body: html } } },
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async updateComment(
		accountSlug: string,
		cardNumber: number,
		commentId: string,
		body: string,
	): Promise<Result<Comment, FizzyApiError>> {
		const html = markdownToHtml(body);
		const result = await this.request<Comment>(
			"PUT",
			`/${accountSlug}/cards/${cardNumber}/comments/${commentId}`,
			{ body: { comment: { body: html } } },
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async deleteComment(
		accountSlug: string,
		cardNumber: number,
		commentId: string,
	): Promise<Result<void, FizzyApiError>> {
		const result = await this.request<void>(
			"DELETE",
			`/${accountSlug}/cards/${cardNumber}/comments/${commentId}`,
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async createStep(
		accountSlug: string,
		cardNumber: number,
		data: { content: string; completed?: boolean },
	): Promise<Result<Step, FizzyApiError>> {
		const body: { content: string; completed?: boolean } = {
			content: data.content,
		};
		if (data.completed !== undefined) {
			body.completed = data.completed;
		}
		const result = await this.request<Step>(
			"POST",
			`/${accountSlug}/cards/${cardNumber}/steps`,
			{ body: { step: body } },
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async updateStep(
		accountSlug: string,
		cardNumber: number,
		stepId: string,
		data: { content?: string; completed?: boolean },
	): Promise<Result<Step, FizzyApiError>> {
		const body: { content?: string; completed?: boolean } = {};
		if (data.content !== undefined) {
			body.content = data.content;
		}
		if (data.completed !== undefined) {
			body.completed = data.completed;
		}
		const result = await this.request<Step>(
			"PUT",
			`/${accountSlug}/cards/${cardNumber}/steps/${stepId}`,
			{ body: { step: body } },
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async deleteStep(
		accountSlug: string,
		cardNumber: number,
		stepId: string,
	): Promise<Result<void, FizzyApiError>> {
		const result = await this.request<void>(
			"DELETE",
			`/${accountSlug}/cards/${cardNumber}/steps/${stepId}`,
		);
		if (result.ok) {
			return ok(undefined);
		}
		return result;
	}

	async createDirectUpload(
		accountSlug: string,
		blob: {
			filename: string;
			byte_size: number;
			checksum: string;
			content_type: string;
		},
	): Promise<Result<DirectUploadResponse, FizzyApiError>> {
		const result = await this.request<DirectUploadResponse>(
			"POST",
			`/${accountSlug}/rails/active_storage/direct_uploads`,
			{ body: { blob } },
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}
}

let clientInstance: FizzyClient | undefined;

export function getFizzyClient(): FizzyClient {
	if (!clientInstance) {
		clientInstance = new FizzyClient();
	}
	return clientInstance;
}

/** Reset singleton for test isolation */
export function resetClient(): void {
	clientInstance = undefined;
}
