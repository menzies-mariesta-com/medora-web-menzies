import * as lists from '$lib/server/medora/master/lookup-lists.server';
import { cacheGetOrSet } from '$lib/server/cache/tiered-cache.server';
import {
	cacheKeys,
	cacheTags
} from '$lib/server/cache/cache-keys.server';

const TTL_SECONDS = 300;

const loaders: Record<
	string,
	() => ReturnType<typeof lists.listGender>
> = {
	gender: () => lists.listGender(),
	maritalStatus: () => lists.listMaritalStatus(),
	title: () => lists.listTitle(),
	identityType: () => lists.listIdentityType(),
	bloodType: () => lists.listBloodType(),
	country: () => lists.listCountry(),
	state: () => lists.listState(),
	city: () => lists.listCity(),
	postalCode: () => lists.listPostalCode(),
	nationality: () => lists.listNationality(),
	religion: () => lists.listReligion(),
	severity: () => lists.listSeverity()
};

export async function getMasterLookupListCached(kind: string) {
	const load = loaders[kind];
	if (!load) throw new Error(`Unknown lookup kind: ${kind}`);
	return cacheGetOrSet({
		key: cacheKeys.masterLookup(kind),
		ttlSeconds: TTL_SECONDS,
		tags: [cacheTags.masterLookup],
		factory: load
	});
}