import type { Board } from "../schemas/boards.js";
import type { Card, CardFilters } from "../schemas/cards.js";
import type { Column } from "../schemas/columns.js";
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
import { collectAll, paginatedFetch } from "./pagination.js";

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

export class FizzyClient {
	readonly baseUrl: string;
	private readonly token: string;

	constructor() {
		const token = process.env.FIZZY_ACCESS_TOKEN;
		if (!token) {
			throw new Error("FIZZY_ACCESS_TOKEN environment variable is required");
		}
		this.token = token;
		this.baseUrl = process.env.FIZZY_BASE_URL || DEFAULT_BASE_URL;
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
	): Promise<Result<Board[], FizzyApiError>> {
		const generator = paginatedFetch<Board>(
			`${this.baseUrl}/${accountSlug}/boards`,
			async (url) => {
				const path = url.replace(this.baseUrl, "");
				const result = await this.request<Board[]>("GET", path);
				if (!result.ok) {
					throw result.error;
				}
				return { data: result.value.data, linkHeader: result.value.linkHeader };
			},
		);
		try {
			const boards = await collectAll(generator);
			return ok(boards);
		} catch (error) {
			return err(error as FizzyApiError);
		}
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

	async listTags(accountSlug: string): Promise<Result<Tag[], FizzyApiError>> {
		const generator = paginatedFetch<Tag>(
			`${this.baseUrl}/${accountSlug}/tags`,
			async (url) => {
				const path = url.replace(this.baseUrl, "");
				const result = await this.request<Tag[]>("GET", path);
				if (!result.ok) {
					throw result.error;
				}
				return { data: result.value.data, linkHeader: result.value.linkHeader };
			},
		);
		try {
			const tags = await collectAll(generator);
			return ok(tags);
		} catch (error) {
			return err(error as FizzyApiError);
		}
	}

	async listColumns(
		accountSlug: string,
		boardId: string,
	): Promise<Result<Column[], FizzyApiError>> {
		const generator = paginatedFetch<Column>(
			`${this.baseUrl}/${accountSlug}/boards/${boardId}/columns`,
			async (url) => {
				const path = url.replace(this.baseUrl, "");
				const result = await this.request<Column[]>("GET", path);
				if (!result.ok) {
					throw result.error;
				}
				return { data: result.value.data, linkHeader: result.value.linkHeader };
			},
		);
		try {
			const columns = await collectAll(generator);
			return ok(columns);
		} catch (error) {
			return err(error as FizzyApiError);
		}
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
	): Promise<Result<Card[], FizzyApiError>> {
		const params = new URLSearchParams();
		if (filters?.board_id) params.set("board_id", filters.board_id);
		if (filters?.column_id) params.set("column_id", filters.column_id);
		if (filters?.status) params.set("status", filters.status);
		for (const id of filters?.tag_ids ?? []) {
			params.append("tag_ids[]", id);
		}
		for (const id of filters?.assignee_ids ?? []) {
			params.append("assignee_ids[]", id);
		}

		const queryString = params.toString();
		const basePath = `/${accountSlug}/cards${queryString ? `?${queryString}` : ""}`;

		const generator = paginatedFetch<Card>(
			`${this.baseUrl}${basePath}`,
			async (url) => {
				const path = url.replace(this.baseUrl, "");
				const result = await this.request<Card[]>("GET", path);
				if (!result.ok) {
					throw result.error;
				}
				return { data: result.value.data, linkHeader: result.value.linkHeader };
			},
		);
		try {
			const cards = await collectAll(generator);
			return ok(cards);
		} catch (error) {
			return err(error as FizzyApiError);
		}
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
	): Promise<Result<Card, FizzyApiError>> {
		const result = await this.request<Card>(
			"POST",
			`/${accountSlug}/cards/${cardNumber}/close`,
		);
		if (result.ok) {
			return ok(result.value.data);
		}
		return result;
	}

	async reopenCard(
		accountSlug: string,
		cardNumber: number,
	): Promise<Result<Card, FizzyApiError>> {
		const result = await this.request<Card>(
			"DELETE",
			`/${accountSlug}/cards/${cardNumber}/close`,
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

export function resetClient(): void {
	clientInstance = undefined;
}
