export type ActionLock = {
	readonly pending: boolean;
	/**
	 * Run `fn` once; while pending, subsequent calls are ignored.
	 * Returns `undefined` when ignored due to an in-flight run.
	 */
	run<T>(fn: () => Promise<T> | T): Promise<T | undefined>;
};

/**
 * Creates a small per-action lock to prevent double-click / concurrent runs.
 * Intended to be used for CRUD buttons and dialog confirms.
 */
export function createActionLock(): ActionLock {
	let pending = $state(false);

	return {
		get pending() {
			return pending;
		},

		async run<T>(fn: () => Promise<T> | T): Promise<T | undefined> {
			if (pending) return undefined;
			pending = true;
			try {
				return await fn();
			} finally {
				pending = false;
			}
		}
	};
}

