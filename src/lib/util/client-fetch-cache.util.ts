/**
 * Client-side SWR-style JSON fetch cache (browser only).
 * Targets sub-100ms perceived nav for repeat reads; revalidates in the background when stale.
 * Failed mutations (HTTP ≥400) do not trigger invalidation — only successful writes purge cached GETs.
 */

import { sortedQuery } from '$lib/util/api-route-template.util';

type CacheEntry<T> = {
	data: T;
	freshUntil: number;
	staleUntil: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_STALE_MS = 5 * 60_000;

/** Bound both maps so a long session cannot grow memory unbounded (oldest entry evicted). */
const MAX_ENTRIES = 200;

function evictOldest<K, V>(map: Map<K, V>): void {
	if (map.size <= MAX_ENTRIES) return;
	const overflow = map.size - MAX_ENTRIES;
	let dropped = 0;
	for (const key of map.keys()) {
		if (dropped >= overflow) break;
		map.delete(key);
		dropped++;
	}
}

/**
 * Lifetime from the response's own `Cache-Control` — the server already decided
 * what may be cached. Anything not explicitly cacheable is never stored.
 */
function ttlFromCacheControl(
	headerValue: string | null
): { ttlMs: number; staleMs: number } | null {
	if (!headerValue) return null;
	const lower = headerValue.toLowerCase();
	if (lower.includes('no-store') || lower.includes('no-cache'))
		return null;
	const maxAge = /(?:^|[,\s])max-age=(\d+)/.exec(lower);
	const sMaxAge = /(?:^|[,\s])s-maxage=(\d+)/.exec(lower);
	const seconds = Number(maxAge?.[1] ?? sMaxAge?.[1] ?? NaN);
	if (!Number.isFinite(seconds)) return null;
	if (seconds <= 0) return null;
	const ttlMs = seconds * 1000;
	const swr = /stale-while-revalidate=(\d+)/.exec(lower);
	return {
		ttlMs,
		staleMs: swr ? ttlMs + Number(swr[1]) * 1000 : ttlMs * 2
	};
}

let nativeFetch: typeof fetch | null = null;

/**
 * Called for every uncached GET `/api` this tab performs. `hooks.client.ts` uses it
 * to learn each page's opening read so hover warm-up reproduces the real URL.
 */
let onApiGet: ((url: string) => void) | null = null;

export function onApiGetObserved(fn: (url: string) => void): void {
	onApiGet = fn;
}

/** Notified when the signed-in identity changes, so client-only caches can reset. */
let onSessionReset: (() => void) | null = null;

export function onSessionResetObserved(fn: () => void): void {
	onSessionReset = fn;
}

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

/**
 * Canonical key: sorted query so `?page=1&pageSize=25` and `?pageSize=25&page=1`
 * are one entry. Hover warm-up and the page mount must land on the same key.
 */
function cacheKey(url: string, method: string): string {
	const parsed = new URL(url, 'http://localhost');
	const query = sortedQuery(parsed.search);
	const canonical = query
		? `${parsed.pathname}?${query}`
		: parsed.pathname;
	return `${method.toUpperCase()}:${canonical}`;
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

/** Reject a shared request for one caller without aborting it for the others. */
function withCallerAbort<T>(
	promise: Promise<T>,
	signal: AbortSignal | null | undefined
): Promise<T> {
	if (!signal) return promise;
	if (signal.aborted) {
		return Promise.reject(new DOMException('Aborted', 'AbortError'));
	}
	return new Promise<T>((resolve, reject) => {
		const onAbort = () =>
			reject(new DOMException('Aborted', 'AbortError'));
		signal.addEventListener('abort', onAbort, { once: true });
		void promise.then(
			(value) => {
				signal.removeEventListener('abort', onAbort);
				resolve(value);
			},
			(err: unknown) => {
				signal.removeEventListener('abort', onAbort);
				reject(err);
			}
		);
	});
}

/**
 * Background revalidation runs detached from any caller, so its rejection has
 * no handler. Swallow it here: the stale value is already served to the caller.
 */
function swallowBackgroundError(p: Promise<unknown>): void {
	void p.catch(() => {
		// Next read retries; a stale value is better than a console explosion.
	});
}

type Fetched<T> = {
	data: T;
	/** `null` when the server said this response must not be cached. */
	cache: { ttlMs: number; staleMs: number } | null;
};

async function fetchAndParse<T>(
	url: string,
	init: RequestInit,
	fallback: { ttlMs: number; staleMs: number }
): Promise<Fetched<T>> {
	const res = await httpFetch(url, init);
	if (!res.ok) {
		throw new Error(`Request failed (${res.status})`);
	}
	const header = res.headers.get('cache-control');
	const data = (await res.json()) as T;
	return {
		data,
		cache: header === null ? fallback : ttlFromCacheControl(header)
	};
}

/** Store a successful read under its canonical key; skip when not cacheable. */
function remember<T>(key: string, fetched: Fetched<T>): T {
	if (fetched.cache) {
		store.set(key, {
			data: fetched.data,
			freshUntil: Date.now() + fetched.cache.ttlMs,
			staleUntil: Date.now() + fetched.cache.staleMs
		});
		evictOldest(store);
	}
	return fetched.data;
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
	const fallback = { ttlMs, staleMs };
	const method = (init.method ?? 'GET').toUpperCase();
	const key = cacheKey(url, method);
	if (!isBrowser() || method !== 'GET' || bypass) {
		/**
		 * Concurrent bypass reads still collapse onto one request. The visit bar and
		 * the visit-type gate both read `visit.bar?visitId=…` with `bypass` in the
		 * same tick; without this they double every chart-page round trip.
		 *
		 * The shared request drops the caller's signal, so one component unmounting
		 * cannot abort the read the other component is still waiting on.
		 */
		const { signal, ...sharedInit } = init;
		const pending = inflight.get(key) as
			| Promise<Fetched<T>>
			| undefined;
		if (pending) return (await withCallerAbort(pending, signal)).data;
		const p = fetchAndParse<T>(url, sharedInit, fallback);
		inflight.set(key, p);
		try {
			return (await withCallerAbort(p, signal)).data;
		} finally {
			inflight.delete(key);
		}
	}

	const now = Date.now();
	const hit = store.get(key) as CacheEntry<T> | undefined;

	if (hit && now < hit.freshUntil) {
		return hit.data;
	}

	if (hit && now < hit.staleUntil) {
		const revalidate = inflight.get(key) as
			| Promise<Fetched<T>>
			| undefined;
		if (!revalidate) {
			const p = fetchAndParse<T>(url, init, fallback)
				.then((fetched) => {
					if (!fetched.cache) store.delete(key);
					return remember(key, fetched);
				})
				.finally(() => inflight.delete(key));
			inflight.set(key, p);
			swallowBackgroundError(p);
		}
		return hit.data;
	}

	const pending = inflight.get(key) as
		| Promise<Fetched<T>>
		| undefined;
	if (pending) return (await pending).data;

	const p = fetchAndParse<T>(url, init, fallback).then((fetched) => {
		if (!fetched.cache) store.delete(key);
		return remember(key, fetched);
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
	for (const key of responseStore.keys()) {
		if (key.includes(urlOrPrefix)) responseStore.delete(key);
	}
	for (const key of responseInflight.keys()) {
		if (key.includes(urlOrPrefix)) responseInflight.delete(key);
	}
}

export function clearClientFetchCache(): void {
	store.clear();
	inflight.clear();
	responseStore.clear();
	responseInflight.clear();
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
const responseInflight = new Map<
	string,
	Promise<ResponseCacheEntry>
>();

function shouldBypassClientApiCache(init?: RequestInit): boolean {
	return init?.cache === 'no-store';
}

function responseFromEntry(entry: ResponseCacheEntry): Response {
	return new Response(entry.body, {
		status: entry.status,
		statusText: entry.statusText,
		headers: entry.headers
	});
}

async function fetchResponseEntry(
	input: RequestInfo | URL,
	init: RequestInit | undefined,
	key: string
): Promise<ResponseCacheEntry> {
	const res = await httpFetch(input, init);
	const body = await res.text();
	const header = res.headers.get('cache-control');
	const lifetime =
		res.ok && header !== null ? ttlFromCacheControl(header) : null;
	const entry: ResponseCacheEntry = {
		body,
		status: res.status,
		statusText: res.statusText,
		headers: [...res.headers.entries()],
		freshUntil: lifetime ? Date.now() + lifetime.ttlMs : Date.now(),
		staleUntil: lifetime ? Date.now() + lifetime.staleMs : Date.now()
	};
	if (lifetime) {
		responseStore.set(key, {
			body: entry.body,
			status: entry.status,
			statusText: entry.statusText,
			headers: entry.headers,
			freshUntil: entry.freshUntil,
			staleUntil: entry.staleUntil
		});
		evictOldest(responseStore);
	} else {
		// Server now forbids caching this route: drop any older copy.
		responseStore.delete(key);
	}
	return entry;
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
	const now = Date.now();
	const hit = responseStore.get(key);

	if (hit && now < hit.freshUntil) {
		return responseFromEntry(hit);
	}

	if (hit && now < hit.staleUntil) {
		if (!responseInflight.has(key)) {
			const p = fetchResponseEntry(input, init, key).finally(() =>
				responseInflight.delete(key)
			);
			responseInflight.set(key, p);
			swallowBackgroundError(p);
		}
		return responseFromEntry(hit);
	}

	const pending = responseInflight.get(key);
	if (pending) {
		const entry = await pending;
		return responseFromEntry(entry);
	}

	const p = fetchResponseEntry(input, init, key).finally(() =>
		responseInflight.delete(key)
	);
	responseInflight.set(key, p);
	try {
		const entry = await p;
		return responseFromEntry(entry);
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
			onApiGet?.(url);
			return cachedFetch(input, init);
		}
		return original(input, init).then((res) => {
			/**
			 * `/api/auth/*` writes change who "we" are. Drop every cached GET so the
			 * next user in this tab can never read the previous session's payloads.
			 */
			if (method !== 'GET' && url.includes('/api/auth/')) {
				clearClientFetchCache();
				onSessionReset?.();
			}
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
