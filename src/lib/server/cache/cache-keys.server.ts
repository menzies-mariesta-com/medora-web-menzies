/** Central cache key + tag strings (server-only). */

const PREFIX = 'medora';

export const cacheKeys = {
	staffSession: (userId: string) => `${PREFIX}:staff-session:${userId}`,
	medoraNavPages: () => `${PREFIX}:nav:pages`,
	masterLookup: (kind: string) => `${PREFIX}:master-lookup:${kind}`,
	masterStatus: () => `${PREFIX}:master-status`,
	hospitalMeta: (hospitalId: string) =>
		`${PREFIX}:hospital-meta:${hospitalId}`,
	/** Per-staff effective page grants in one hospital (union of their groups). */
	staffPagePermissions: (staffId: string, hospitalId: string) =>
		`${PREFIX}:staff-page-perms:${hospitalId}:${staffId}`,
	apiGetResponse: (digest: string) => `${PREFIX}:api-get:${digest}`
} as const;

export const cacheTags = {
	staffSession: 'staff-session',
	medoraNav: 'medora-nav',
	masterLookup: 'master-lookup',
	masterStatus: 'master-status',
	staffPagePermissions: 'staff-page-permissions',
	apiGet: 'api-get'
} as const;

export function hospitalApiGetTag(hospitalId: string): string {
	return `api-get-hospital:${hospitalId}`;
}

export function hospitalMetaTag(hospitalId: string): string {
	return `hospital-meta:${hospitalId}`;
}