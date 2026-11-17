import {
	invalidateCacheTag,
	invalidateCacheKey
} from '$lib/server/cache/tiered-cache.server';
import {
	cacheKeys,
	cacheTags,
	hospitalApiGetTag,
	hospitalMetaTag
} from '$lib/server/cache/cache-keys.server';
import { invalidateMasterLookupCaches } from '$lib/server/http/api-mutation-cache-invalidate.server';

export { invalidateMasterLookupCaches };

/** Call after DB writes to global master catalogs (seeds, admin imports). */
export async function afterGlobalMasterCatalogMutation(): Promise<void> {
	await invalidateMasterLookupCaches();
	await invalidateCacheTag(cacheTags.apiGet);
}

/** Call after hospital-scoped master CRUD from server modules (form actions, jobs). */
export async function afterHospitalMasterCatalogMutation(
	hospitalId: string
): Promise<void> {
	await afterGlobalMasterCatalogMutation();
	await invalidateCacheTag(hospitalApiGetTag(hospitalId));
	await invalidateCacheTag(hospitalMetaTag(hospitalId));
	await invalidateCacheKey(cacheKeys.hospitalMeta(hospitalId));
}