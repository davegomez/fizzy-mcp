import { z } from "zod";

// API-enforced pagination bounds - match Fizzy API constraints
export const DEFAULT_LIMIT = 25;
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 100;

export const PaginationMetadataSchema = z.object({
	returned: z.number().int().nonnegative(),
	has_more: z.boolean(),
	next_cursor: z.string().optional(),
});

export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;

export type PaginatedResult<T> = {
	items: T[];
	pagination: PaginationMetadata;
};

// Factory to create typed paginated response schemas for each resource type
export function createPaginatedResultSchema<T extends z.ZodTypeAny>(
	itemSchema: T,
) {
	return z.object({
		items: z.array(itemSchema),
		pagination: PaginationMetadataSchema,
	});
}

export const LimitParamSchema = z
	.number()
	.int()
	.min(MIN_LIMIT)
	.max(MAX_LIMIT)
	.default(DEFAULT_LIMIT);
