export type RemoteInvokeBody = {
	/**
	 * Suffix that identifies the remote module file, e.g.
	 * `table/information-table/patient-visit.remote.ts`
	 */
	module: string;
	/** Export name inside that remote module file */
	fn: string;
	/** Positional args forwarded to the remote function */
	args?: unknown[];
};

// Must match: `src/routes/api/(private)/heka-remote/invoke/+server.ts`
export const REMOTE_INVOKE_URL = '/api/heka-remote/invoke' as const;

async function postJson<T>(
	url: string,
	body: unknown
): Promise<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		// Ensures better-auth session cookies are included.
		credentials: 'include',
		cache: 'no-store',
		body: JSON.stringify(body)
	});

	const text = await res.text().catch(() => '');
	if (!res.ok) {
		throw new Error(
			text || `Request failed: ${res.status} ${res.statusText}`
		);
	}

	const trimmed = text.trim();
	if (!trimmed) return undefined as T;

	return JSON.parse(trimmed) as T;
}

/**
 * Invoke an exported function from a `$lib/remote/<path>/*.remote.ts` module via
 * `/api/heka-remote/invoke`.
 *
 * Note: This is client-side only. Server-side endpoints must import and call
 * `$lib/remote/**` directly.
 */
export async function remoteInvoke<T>(
	body: RemoteInvokeBody
): Promise<T> {
	return postJson<T>(REMOTE_INVOKE_URL, {
		module: body.module,
		fn: body.fn,
		args: Array.isArray(body.args) ? body.args : []
	});
}

