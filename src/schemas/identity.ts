import { z } from "zod";

export const UserSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.enum(["owner", "member"]),
	active: z.boolean(),
	email_address: z.string().email(),
	created_at: z.string(),
	url: z.string().url(),
});

export const AccountSchema = z.object({
	id: z.string(),
	name: z.string(),
	slug: z.string(),
	created_at: z.string(),
	user: UserSchema,
});

export const IdentityResponseSchema = z.object({
	accounts: z.array(AccountSchema),
});

export type User = z.infer<typeof UserSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type IdentityResponse = z.infer<typeof IdentityResponseSchema>;
