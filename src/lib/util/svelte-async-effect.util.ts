/**
 * Helpers for async work inside Svelte 5 `$effect` — avoid stale writes after unmount or fast deps change.
 */

/** Standard cleanup returned from an effect that started async work. */
export function asyncEffectGuard(
	ac?: AbortController
): () => void {
	let cancelled = false;
	return () => {
		cancelled = true;
		ac?.abort();
		return cancelled;
	};
}

export function createEffectAbort(): {
	signal: AbortSignal;
	dispose: () => void;
} {
	const ac = new AbortController();
	let cancelled = false;
	return {
		signal: ac.signal,
		dispose: () => {
			cancelled = true;
			ac.abort();
		}
	};
}

export function isAbortError(err: unknown): boolean {
	return (
		err instanceof DOMException && err.name === 'AbortError'
	);
}