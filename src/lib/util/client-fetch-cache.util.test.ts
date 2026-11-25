import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	cachedFetch,
	clearClientFetchCache,
	fetchJsonCached,
	invalidateClientFetchCache
} from '$lib/util/client-fetch-cache.util';

describe('fetchJsonCached', () => {
	afterEach(() => {
		clearClientFetchCache();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('returns fresh cached data without a second fetch', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ ok: 1 }), { status: 200 })
			);
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		const a = await fetchJsonCached<{ ok: number }>('/api/x', {
			ttlMs: 60_000
		});
		const b = await fetchJsonCached<{ ok: number }>('/api/x', {
			ttlMs: 60_000
		});

		expect(a).toEqual({ ok: 1 });
		expect(b).toEqual({ ok: 1 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('invalidateClientFetchCache drops entries by prefix', async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(
					new Response(JSON.stringify([1]), { status: 200 })
				)
			);
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		await fetchJsonCached('/api/medora/master/lookup?kind=severity');
		invalidateClientFetchCache('/api/medora/master/lookup');
		await fetchJsonCached('/api/medora/master/lookup?kind=severity');

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('stale revalidation failure never becomes an unhandled rejection', async () => {
		const unhandled: unknown[] = [];
		const onUnhandled = (reason: unknown) => unhandled.push(reason);
		process.on('unhandledRejection', onUnhandled);

		let shouldFail = false;
		const fetchMock = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(
					shouldFail
						? new Response('boom', { status: 500 })
						: new Response(JSON.stringify([1]), { status: 200 })
				)
			);
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		// Seed the cache, then let it go stale so the next read is served from
		// cache while a background revalidation runs.
		await fetchJsonCached('/api/s', { ttlMs: 1, staleMs: 60_000 });
		await new Promise((r) => setTimeout(r, 5));
		shouldFail = true;

		// Stale hit: returns cached data immediately, revalidates in the background.
		await expect(
			fetchJsonCached('/api/s', { ttlMs: 1, staleMs: 60_000 })
		).resolves.toEqual([1]);

		await new Promise((r) => setTimeout(r, 30));
		process.off('unhandledRejection', onUnhandled);

		expect(unhandled).toEqual([]);
	});

	it('collapses concurrent bypass reads onto one request', async () => {
		let resolveFetch: (res: Response) => void = () => {};
		const fetchMock = vi.fn().mockImplementation(
			() =>
				new Promise<Response>((resolve) => {
					resolveFetch = resolve;
				})
		);
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		// Two components read the same visit.bar URL with `bypass` in one tick.
		const a = fetchJsonCached<{ ok: number }>(
			'/api/visit-bar?visitId=1',
			{
				bypass: true
			}
		);
		const b = fetchJsonCached<{ ok: number }>(
			'/api/visit-bar?visitId=1',
			{
				bypass: true
			}
		);
		resolveFetch(
			new Response(JSON.stringify({ ok: 1 }), { status: 200 })
		);

		await expect(Promise.all([a, b])).resolves.toEqual([
			{ ok: 1 },
			{ ok: 1 }
		]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('a caller abort rejects only that caller, not the shared request', async () => {
		let resolveFetch: (res: Response) => void = () => {};
		const fetchMock = vi.fn().mockImplementation(
			() =>
				new Promise<Response>((resolve) => {
					resolveFetch = resolve;
				})
		);
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		const controller = new AbortController();
		const aborted = fetchJsonCached('/api/visit-bar?visitId=2', {
			bypass: true,
			signal: controller.signal
		});
		const kept = fetchJsonCached('/api/visit-bar?visitId=2', {
			bypass: true
		});

		controller.abort();
		resolveFetch(
			new Response(JSON.stringify({ ok: 2 }), { status: 200 })
		);

		await expect(aborted).rejects.toThrow();
		await expect(kept).resolves.toEqual({ ok: 2 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('never caches a no-store response', async () => {
		let call = 0;
		const fetchMock = vi.fn().mockImplementation(() => {
			call++;
			return Promise.resolve(
				new Response(JSON.stringify({ call }), {
					status: 200,
					headers: { 'cache-control': 'no-store, private' }
				})
			);
		});
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		await fetchJsonCached('/api/medora/hospital/x/home/billing/bill');
		await fetchJsonCached('/api/medora/hospital/x/home/billing/bill');

		// Live billing data must be re-read every time.
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('honours the response max-age instead of the caller default', async () => {
		let call = 0;
		const fetchMock = vi.fn().mockImplementation(() => {
			call++;
			return Promise.resolve(
				new Response(JSON.stringify({ call }), {
					status: 200,
					headers: { 'cache-control': 'private, max-age=180' }
				})
			);
		});
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		// Default ttlMs is 60s, but the server granted 180s.
		await fetchJsonCached('/api/medora/master/lookup?kind=severity', {
			ttlMs: 1
		});
		const second = await fetchJsonCached(
			'/api/medora/master/lookup?kind=severity',
			{ ttlMs: 1 }
		);

		expect(second).toEqual({ call: 1 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('treats reordered query params as one cache entry', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify([1]), { status: 200 })
			);
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		await fetchJsonCached('/api/medora/list?page=1&pageSize=25');
		await fetchJsonCached('/api/medora/list?pageSize=25&page=1');

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('cachedFetch', () => {
	afterEach(() => {
		clearClientFetchCache();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('serves a cacheable response twice without a second request', async () => {
		const fetchMock = vi.fn().mockImplementation(() =>
			Promise.resolve(
				new Response(JSON.stringify([1]), {
					status: 200,
					headers: { 'cache-control': 'private, max-age=90' }
				})
			)
		);
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		await cachedFetch('/api/medora/hospital/h/home/administration/branches');
		await cachedFetch('/api/medora/hospital/h/home/administration/branches');

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('re-requests a no-store response every time', async () => {
		const fetchMock = vi.fn().mockImplementation(() =>
			Promise.resolve(
				new Response(JSON.stringify([1]), {
					status: 200,
					headers: { 'cache-control': 'no-store, private' }
				})
			)
		);
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		await cachedFetch('/api/medora/hospital/h/home/adt/bed-status');
		await cachedFetch('/api/medora/hospital/h/home/adt/bed-status');

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('one caller aborting does not reject a caller joined to the same request', async () => {
		let resolveFetch: (res: Response) => void = () => {};
		const fetchMock = vi.fn().mockImplementation(
			() =>
				new Promise<Response>((resolve) => {
					resolveFetch = resolve;
				})
		);
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		// Triage reads mode=settings twice in one mount (panel + color map):
		// the first caller's unmount must not abort the second's read.
		const controller = new AbortController();
		const aborted = cachedFetch('/api/triage?mode=settings', {
			signal: controller.signal
		});
		const kept = cachedFetch('/api/triage?mode=settings');

		controller.abort();
		resolveFetch(
			new Response(JSON.stringify({ ok: 1 }), {
				status: 200,
				headers: { 'cache-control': 'private, max-age=60' }
			})
		);

		await expect(kept).resolves.toBeInstanceOf(Response);
		await expect(kept.then((r) => r.json())).resolves.toEqual({ ok: 1 });
		await expect(aborted).rejects.toThrow();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
