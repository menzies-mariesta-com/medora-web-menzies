import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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
			.mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
		vi.stubGlobal('window', {} as Window);
		vi.stubGlobal('fetch', fetchMock);

		const a = await fetchJsonCached<{ ok: number }>('/api/x', { ttlMs: 60_000 });
		const b = await fetchJsonCached<{ ok: number }>('/api/x', { ttlMs: 60_000 });

		expect(a).toEqual({ ok: 1 });
		expect(b).toEqual({ ok: 1 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('invalidateClientFetchCache drops entries by prefix', async () => {
		const fetchMock = vi.fn().mockImplementation(() =>
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
});