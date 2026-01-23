import { UserError } from "fastmcp";

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
		super(401, "Authentication failed. Check your FIZZY_ACCESS_TOKEN.");
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

/**
 * Convert FizzyApiError to fastmcp UserError for tool responses
 */
export function toUserError(error: FizzyApiError): UserError {
	return new UserError(error.message);
}
