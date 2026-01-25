// Result ADT forces explicit error handling at call sites—exceptions propagate
// silently but Result<T,E> makes failure a first-class value the compiler tracks.
export type Result<T, E = Error> =
	| { ok: true; value: T }
	| { ok: false; error: E };

// `never` in return types enables type narrowing: ok() can't produce errors,
// err() can't produce values—so Result<T,E> union collapses correctly after checks.
export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}

// Type guards narrow the discriminated union so TypeScript knows which
// branch you're in—accessing .value after isOk() is safe without casts.
export function isOk<T, E>(
	result: Result<T, E>,
): result is { ok: true; value: T } {
	return result.ok;
}

export function isErr<T, E>(
	result: Result<T, E>,
): result is { ok: false; error: E } {
	return !result.ok;
}
