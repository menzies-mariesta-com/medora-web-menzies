import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	cacheGetOrSet,
	invalidateCacheKey,
	invalidateCacheTag
} from '$lib/server/cache/tiered-cache.server';

describe('tiered-cache (memory L1)', () => {
	afterEach(async () => {
		await invalidateCacheTag('test-tag');
	});

	it('dedupes factory within TTL', async () => {
		const factory = vi.fn().mockResolvedValue({ n: 1 });
		const a = await cacheGetOrSet({
			key: 'test:key',
			ttlSeconds: 60,
			tags: ['test-tag'],
			factory
		});
		const b = await cacheGetOrSet({
			key: 'test:key',
			ttlSeconds: 60,
			tags: ['test-tag'],
			factory
		});
		expect(a).toEqual({ n: 1 });
		expect(b).toEqual({ n: 1 });
		expect(factory).toHaveBeenCalledTimes(1);
	});

	it('invalidateCacheKey forces refetch', async () => {
		let n = 0;
		const factory = vi.fn(async () => ({ n: ++n }));
		await cacheGetOrSet({
			key: 'test:key2',
			ttlSeconds: 60,
			factory
		});
		await invalidateCacheKey('test:key2');
		const again = await cacheGetOrSet({
			key: 'test:key2',
			ttlSeconds: 60,
			factory
		});
		expect(again.n).toBe(2);
		expect(factory).toHaveBeenCalledTimes(2);
	});
});