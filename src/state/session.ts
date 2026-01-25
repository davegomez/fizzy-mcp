import type { User } from "../schemas/identity.js";

export type SessionSource = "explicit" | "auto-detect";

export interface SessionContext {
	account: {
		slug: string;
		name: string;
		id: string;
	};
	user: {
		id: string;
		name: string;
		role: User["role"];
	};
	source?: SessionSource;
}

let session: SessionContext | undefined;

export function getSession(): SessionContext | undefined {
	return session;
}

export function setSession(ctx: SessionContext): void {
	session = ctx;
}

export function getDefaultAccount(): string | undefined {
	return session?.account.slug;
}

export function clearSession(): void {
	session = undefined;
}
