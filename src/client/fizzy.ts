import { err, ok, type Result } from "../types/result.js";
import {
	AuthenticationError,
	FizzyApiError,
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	ValidationError,
} from "./errors.js";

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
