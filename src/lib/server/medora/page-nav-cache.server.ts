import { ensureDb } from '$lib/server/db';
import type { PageWithRelations } from '$lib/model/type/medora/page.type';
import {
	cacheGetOrSet,
	invalidateCacheKey,
	invalidateCacheTag
} from '$lib/server/cache/tiered-cache.server';
import {
	cacheKeys,
	cacheTags
} from '$lib/server/cache/cache-keys.server';

const TTL_SECONDS = 120;

/** Cached full page tree for module bar (status + module relations). */
export async function getMedoraPagesForNav(): Promise<PageWithRelations[]> {
	return cacheGetOrSet({
		key: cacheKeys.medoraNavPages(),
		ttlSeconds: TTL_SECONDS,
		tags: [cacheTags.medoraNav],
		factory: async () =>
			(await ensureDb().query.pageTable.findMany({
				with: {
					module: true,
					status: true
				}
			})) as unknown as PageWithRelations[]
	});
}

/** Call after page CRUD in admin (optional). */
export async function invalidateMedoraPagesNavCache(): Promise<void> {
	await invalidateCacheKey(cacheKeys.medoraNavPages());
	await invalidateCacheTag(cacheTags.medoraNav);
}