import { UserError } from "fastmcp";
import { ENV_TOKEN } from "../config.js";

export interface ErrorContext {
	resourceType?: string;
	resourceId?: string;
	container?: string;
}

const RESOURCE_LIST_TOOLS: Record<string, string> = {
	Board: "fizzy_list_boards",
	Card: "fizzy_list_cards",
	Column: "fizzy_list_columns",
	Tag: "fizzy_list_tags",
	Comment: "fizzy_list_comments",
	Step: "fizzy_get_card",
	Account: "fizzy_whoami",
};

export class FizzyApiError extends Error {
	constructor(
		public readonly status: number,
		message: string,
		public readonly details?: Record<string, string[]>,
	) {
		super(message);
		this.name = "FizzyApiError";
	}
}

export class AuthenticationError extends FizzyApiError {
	constructor() {
		super(401, `Authentication failed. Check your ${ENV_TOKEN}.`);
		this.name = "AuthenticationError";
	}
}

export class ForbiddenError extends FizzyApiError {
	constructor() {
		super(403, "You don't have permission to perform this action.");
		this.name = "ForbiddenError";
	}
}

export class NotFoundError extends FizzyApiError {
	constructor(resource?: string) {
		super(404, resource ? `${resource} not found.` : "Resource not found.");
		this.name = "NotFoundError";
	}
}

export class ValidationError extends FizzyApiError {
	constructor(details?: Record<string, string[]>) {
		const message = details
			? `Validation failed: ${formatValidationErrors(details)}`
			: "Validation failed.";
		super(422, message, details);
		this.name = "ValidationError";
	}
}

export class RateLimitError extends FizzyApiError {
	constructor() {
		super(429, "Rate limit exceeded. Please wait before making more requests.");
		this.name = "RateLimitError";
	}
}

function formatValidationErrors(details: Record<string, string[]>): string {
	return Object.entries(details)
		.map(([field, errors]) => `${field}: ${errors.join(", ")}`)
		.join("; ");
}

function formatInstructiveMessage(
	error: FizzyApiError,
	context?: ErrorContext,
): string {
	const resource = context?.resourceType ?? "Resource";
	const id = context?.resourceId ? ` ${context.resourceId}` : "";
	const container = context?.container ? ` in ${context.container}` : "";
	const listTool = RESOURCE_LIST_TOOLS[resource] ?? "fizzy_list_boards";

	if (error instanceof AuthenticationError) {
		return `[UNAUTHORIZED] Authentication failed. Set ${ENV_TOKEN} environment variable with valid API token.`;
	}

	if (error instanceof ForbiddenError) {
		return `[FORBIDDEN] ${resource}${id}: Access denied. Use ${listTool} to verify accessible resources.`;
	}

	if (error instanceof NotFoundError) {
		return `[NOT_FOUND] ${resource}${id}: Not found${container}. Try ${listTool} to see available items.`;
	}

	if (error instanceof ValidationError) {
		const fieldErrors = error.details
			? Object.entries(error.details)
					.map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
					.join("; ")
			: "Invalid input";
		return `[VALIDATION] ${fieldErrors}.`;
	}

	if (error instanceof RateLimitError) {
		return "[RATE_LIMITED] Too many requests. Wait before retrying.";
	}

	return `[ERROR] ${error.message}`;
}

/**
 * Convert FizzyApiError to fastmcp UserError for tool responses.
 * Pass context to generate instructive messages with recovery suggestions.
 */
export function toUserError(
	error: FizzyApiError,
	context?: ErrorContext,
): UserError {
	const message = formatInstructiveMessage(error, context);
	return new UserError(message);
}
