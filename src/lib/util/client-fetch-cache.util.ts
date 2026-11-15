/**
 * Client-side SWR-style JSON fetch cache (browser only).
 * Targets sub-100ms perceived nav for repeat reads; revalidates in the background when stale.
 * Failed mutations (HTTP ≥400) do not trigger invalidation — only successful writes purge cached GETs.
 */

type CacheEntry<T> = {
	data: T;
	freshUntil: number;
	staleUntil: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_STALE_MS = 5 * 60_000;

let nativeFetch: typeof fetch | null = null;

/** Set by `hooks.client.ts` so cached reads never recurse through the patch. */
export function bindNativeFetch(fn: typeof fetch): void {
	nativeFetch = fn;
}

function httpFetch(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const fn = nativeFetch ?? globalThis.fetch.bind(globalThis);
	return fn(input, init);
}

function cacheKey(url: string, method: string): string {
	return `${method.toUpperCase()}:${url}`;
}

export type FetchJsonCachedOptions = RequestInit & {
	/** Fresh window — no network (default 60s). */
	ttlMs?: number;
	/** Stale window — return cached data but revalidate (default 5m). */
	staleMs?: number;
	/** Skip cache for this request. */
	bypass?: boolean;
};

function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

async function fetchAndParse<T>(
	url: string,
	init: RequestInit
): Promise<T> {
	const res = await httpFetch(url, init);
	if (!res.ok) {
		throw new Error(`Request failed (${res.status})`);
	}
	return (await res.json()) as T;
}

/** GET JSON with in-memory SWR. Safe on server (always hits network). */
export async function fetchJsonCached<T>(
	url: string,
	options: FetchJsonCachedOptions = {}
): Promise<T> {
	const {
		ttlMs = DEFAULT_TTL_MS,
		staleMs = DEFAULT_STALE_MS,
		bypass = false,
		...init
	} = options;
	const method = (init.method ?? 'GET').toUpperCase();
	if (!isBrowser() || method !== 'GET' || bypass) {
		return fetchAndParse<T>(url, init);
	}

	const key = cacheKey(url, method);
	const now = Date.now();
	const hit = store.get(key) as CacheEntry<T> | undefined;

	if (hit && now < hit.freshUntil) {
		return hit.data;
	}

	if (hit && now < hit.staleUntil) {
		const revalidate = inflight.get(key) as Promise<T> | undefined;
		if (!revalidate) {
			const p = fetchAndParse<T>(url, init)
				.then((data) => {
					store.set(key, {
						data,
						freshUntil: Date.now() + ttlMs,
						staleUntil: Date.now() + staleMs
					});
					return data;
				})
				.finally(() => inflight.delete(key));
			inflight.set(key, p);
		}
		return hit.data;
	}

	const pending = inflight.get(key) as Promise<T> | undefined;
	if (pending) return pending;

	const p = fetchAndParse<T>(url, init).then((data) => {
		store.set(key, {
			data,
			freshUntil: Date.now() + ttlMs,
			staleUntil: Date.now() + staleMs
		});
		return data;
	});
	inflight.set(key, p);
	try {
		return await p;
	} finally {
		inflight.delete(key);
	}
}

/** Drop one URL or every entry whose key starts with `urlPrefix`. */
export function invalidateClientFetchCache(
	urlOrPrefix: string
): void {
	for (const key of store.keys()) {
		if (key.includes(urlOrPrefix)) store.delete(key);
	}
	for (const key of inflight.keys()) {
		if (key.includes(urlOrPrefix)) inflight.delete(key);
	}
}

export function clearClientFetchCache(): void {
	store.clear();
	inflight.clear();
}

type ResponseCacheEntry = {
	body: string;
	status: number;
	statusText: string;
	headers: [string, string][];
	freshUntil: number;
	staleUntil: number;
};

const responseStore = new Map<string, ResponseCacheEntry>();
const responseInflight = new Map<string, Promise<Response>>();

function shouldBypassClientApiCache(init?: RequestInit): boolean {
	return init?.cache === 'no-store';
}

function ttlForApiPath(url: string): { ttlMs: number; staleMs: number } {
	if (url.includes('/api/medora/master/')) {
		return { ttlMs: 120_000, staleMs: 600_000 };
	}
	if (
		url.includes('/inventory-setup/') ||
		url.includes('/administration/')
	) {
		return { ttlMs: 90_000, staleMs: 300_000 };
	}
	return { ttlMs: DEFAULT_TTL_MS, staleMs: DEFAULT_STALE_MS };
}

function responseFromEntry(entry: ResponseCacheEntry): Response {
	return new Response(entry.body, {
		status: entry.status,
		statusText: entry.statusText,
		headers: entry.headers
	});
}

/** GET `fetch` with SWR — returns real `Response` objects for app-wide use. */
export async function cachedFetch(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const url =
		typeof input === 'string'
			? input
			: input instanceof URL
				? input.href
				: input.url;
	const method = (init?.method ?? 'GET').toUpperCase();
	if (
		!isBrowser() ||
		method !== 'GET' ||
		!url.includes('/api/') ||
		shouldBypassClientApiCache(init)
	) {
		return httpFetch(input, init);
	}

	const key = cacheKey(url, method);
	const { ttlMs, staleMs } = ttlForApiPath(url);
	const now = Date.now();
	const hit = responseStore.get(key);

	if (hit && now < hit.freshUntil) {
		return responseFromEntry(hit);
	}

	if (hit && now < hit.staleUntil) {
		if (!responseInflight.has(key)) {
			const p = httpFetch(input, init)
				.then(async (res) => {
					if (res.ok) {
						const body = await res.clone().text();
						responseStore.set(key, {
							body,
							status: res.status,
							statusText: res.statusText,
							headers: [...res.headers.entries()],
							freshUntil: Date.now() + ttlMs,
							staleUntil: Date.now() + staleMs
						});
					}
					return res;
				})
				.finally(() => responseInflight.delete(key));
			responseInflight.set(key, p);
		}
		return responseFromEntry(hit);
	}

	const pending = responseInflight.get(key);
	if (pending) return pending;

	const p = httpFetch(input, init).then(async (res) => {
		if (res.ok) {
			const body = await res.clone().text();
			responseStore.set(key, {
				body,
				status: res.status,
				statusText: res.statusText,
				headers: [...res.headers.entries()],
				freshUntil: Date.now() + ttlMs,
				staleUntil: Date.now() + staleMs
			});
		}
		return res;
	});
	responseInflight.set(key, p);
	try {
		return await p;
	} finally {
		responseInflight.delete(key);
	}
}

/** Patch `globalThis.fetch` for GET /api caching + mutation invalidation headers. */
export function installGlobalFetchPerformance(): void {
	if (!isBrowser()) return;
	const original = globalThis.fetch.bind(globalThis);
	bindNativeFetch(original);

	globalThis.fetch = (
		input: RequestInfo | URL,
		init?: RequestInit
	): Promise<Response> => {
		const url =
			typeof input === 'string'
				? input
				: input instanceof URL
					? input.href
					: input.url;
		const method = (init?.method ?? 'GET').toUpperCase();
		if (
			method === 'GET' &&
			url.includes('/api/') &&
			!shouldBypassClientApiCache(init)
		) {
			return cachedFetch(input, init);
		}
		return original(input, init).then((res) => {
			if (
				method !== 'GET' &&
				res.ok &&
				res.headers.get('X-Medora-Invalidate-Client-Cache')
			) {
				invalidateClientFetchCache(
					res.headers.get('X-Medora-Invalidate-Client-Cache')!
				);
			}
			return res;
		});
	};
}