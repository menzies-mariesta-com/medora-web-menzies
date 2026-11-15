import { listStatuses } from '$lib/server/medora/master/status-list.server';
import { cacheGetOrSet } from '$lib/server/cache/tiered-cache.server';
import {
	cacheKeys,
	cacheTags
} from '$lib/server/cache/cache-keys.server';

const TTL_SECONDS = 300;

export async function listStatusesCached() {
	return cacheGetOrSet({
		key: cacheKeys.masterStatus(),
		ttlSeconds: TTL_SECONDS,
		tags: [cacheTags.masterStatus, cacheTags.masterLookup],
		factory: () => listStatuses()
	});
}