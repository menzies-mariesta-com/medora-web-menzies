type JsonObject = Record<string, unknown>;

type FetchLike = typeof fetch;

/**
 * RPC endpoint for `$lib/remote/…/*.remote.ts` via `*.http.tool.svelte.ts` wrappers.
 * Must **not** use `/api/remote/invoke` — that path is reserved for SvelteKit
 * experimental remote functions (`kit.experimental.remoteFunctions`), which POST a
 * different body shape; sharing the route caused 400s in production.
 */
export const REMOTE_INVOKE_URL = '/api/heka-remote/invoke' as const;

async function postJson<T>(
	url: string,
	body?: JsonObject,
	fetchFn: FetchLike = fetch
): Promise<T> {
	const res = await fetchFn(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		// Ensures better-auth session cookies are included.
		credentials: 'include',
		cache: 'no-store',
		body: body ? JSON.stringify(body) : undefined
	});

	const text = await res.text().catch(() => '');

	if (!res.ok) {
		throw new Error(
			text || `Request failed: ${res.status} ${res.statusText}`
		);
	}

	const trimmed = text.trim();
	if (!trimmed) {
		return undefined as T;
	}

	return JSON.parse(trimmed) as T;
}

/** Invoke a function from `$lib/remote/…/*.remote.ts` (see `src/routes/api/(private)/heka-remote/invoke/+server.ts`). */
async function postRemoteInvoke<T>(
	body: JsonObject,
	fetchFn: FetchLike = fetch
): Promise<T> {
	return postJson<T>(REMOTE_INVOKE_URL, body, fetchFn);
}

export const remoteHttpClient = {
	postJson,
	postRemoteInvoke
};
