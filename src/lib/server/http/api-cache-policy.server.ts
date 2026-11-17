/** Central GET /api cache policy (per-route tiers + picker overrides). */

import {
	API_ROUTE_TIER_BY_TEMPLATE,
	type ApiRouteTierId
} from '$lib/util/api-route-tier.generated';
import { pathnameToApiTemplate } from '$lib/util/api-route-template.util';
import { cacheTags } from '$lib/server/cache/cache-keys.server';

export type ApiCachePolicy =
	| { mode: 'no-store' }
	| {
			mode: 'tiered';
			ttlSeconds: number;
			tags: string[];
			maxAgeSeconds: number;
			staleWhileRevalidateSeconds: number;
	  };

function hospitalIdFromPath(pathname: string): string | null {
	const m = pathname.match(/^\/api\/medora\/hospital\/([^/]+)\//);
	return m?.[1] ?? null;
}

function tagsForPath(
	pathname: string,
	extra: string[] = []
): string[] {
	const tags = ['api-get', ...extra];
	const hid = hospitalIdFromPath(pathname);
	if (hid) tags.push(`api-get-hospital:${hid}`);
	return tags;
}

function tierConfig(
	tier: ApiRouteTierId,
	pathname: string
): ApiCachePolicy {
	switch (tier) {
		case 'no-store':
			return { mode: 'no-store' };
		case 'master-long':
			return {
				mode: 'tiered',
				ttlSeconds: 300,
				tags: tagsForPath(pathname, [
					cacheTags.masterLookup,
					cacheTags.masterStatus
				]),
				maxAgeSeconds: 120,
				staleWhileRevalidateSeconds: 600
			};
		case 'picker-long':
			return {
				mode: 'tiered',
				ttlSeconds: 180,
				tags: tagsForPath(pathname),
				maxAgeSeconds: 90,
				staleWhileRevalidateSeconds: 300
			};
		case 'account-medium':
			return {
				mode: 'tiered',
				ttlSeconds: 120,
				tags: tagsForPath(pathname),
				maxAgeSeconds: 60,
				staleWhileRevalidateSeconds: 240
			};
		case 'admin-medium':
			return {
				mode: 'tiered',
				ttlSeconds: 180,
				tags: tagsForPath(pathname, ['medora-admin']),
				maxAgeSeconds: 90,
				staleWhileRevalidateSeconds: 300
			};
		case 'report-medium':
			return {
				mode: 'tiered',
				ttlSeconds: 90,
				tags: tagsForPath(pathname),
				maxAgeSeconds: 60,
				staleWhileRevalidateSeconds: 180
			};
		case 'dashboard-short':
			return {
				mode: 'tiered',
				ttlSeconds: 45,
				tags: tagsForPath(pathname),
				maxAgeSeconds: 30,
				staleWhileRevalidateSeconds: 90
			};
		case 'default-short':
		default:
			return {
				mode: 'tiered',
				ttlSeconds: 60,
				tags: tagsForPath(pathname),
				maxAgeSeconds: 45,
				staleWhileRevalidateSeconds: 120
			};
	}
}

function pickerModeBoost(
	pathname: string,
	search: URLSearchParams
): ApiRouteTierId | null {
	const mode = (search.get('mode') ?? '').toLowerCase();
	if (
		mode.includes('allforpicker') ||
		mode.includes('categories') ||
		mode === 'unittypes' ||
		mode.endsWith('.list') ||
		mode.startsWith('picker')
	) {
		return 'picker-long';
	}
	if (
		(pathname.includes('/inventory-setup/') ||
			pathname.includes('/administration/')) &&
		(mode === '' || mode === 'list')
	) {
		return 'master-long';
	}
	return null;
}

/** Resolve cache behavior for a GET /api request. */
export function getApiCachePolicy(
	pathname: string,
	search: URLSearchParams
): ApiCachePolicy {
	if (!pathname.startsWith('/api/')) {
		return { mode: 'no-store' };
	}

	const boost = pickerModeBoost(pathname, search);
	if (boost) {
		return tierConfig(boost, pathname);
	}

	const template = pathnameToApiTemplate(pathname);
	const tier =
		API_ROUTE_TIER_BY_TEMPLATE[template] ?? 'default-short';
	return tierConfig(tier, pathname);
}
