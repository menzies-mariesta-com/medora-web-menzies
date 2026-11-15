import { getStaffByUserIdWithRelations } from '$lib/server/medora/administration/staff.server';
import {
	cacheGetOrSet,
	invalidateCacheKey
} from '$lib/server/cache/tiered-cache.server';
import {
	cacheKeys,
	cacheTags
} from '$lib/server/cache/cache-keys.server';

const TTL_SECONDS = 45;

type StaffRow = NonNullable<
	Awaited<ReturnType<typeof getStaffByUserIdWithRelations>>
>;

/** Session staff with relations; short TTL to avoid a heavy join on every request. */
export async function getStaffByUserIdWithRelationsCached(
	userId: string
): Promise<StaffRow | null> {
	return cacheGetOrSet({
		key: cacheKeys.staffSession(userId),
		ttlSeconds: TTL_SECONDS,
		tags: [cacheTags.staffSession],
		factory: async () => {
			const staff = await getStaffByUserIdWithRelations(userId);
			return staff ?? null;
		}
	});
}

export async function invalidateStaffSessionCache(
	userId: string
): Promise<void> {
	await invalidateCacheKey(cacheKeys.staffSession(userId));
}