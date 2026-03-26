type JsonObject = Record<string, unknown>;

type FetchLike = typeof fetch;

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

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(
			text || `Request failed: ${res.status} ${res.statusText}`
		);
	}

	return (await res.json()) as T;
}

export const remoteHttpClient = {
	postJson
};
