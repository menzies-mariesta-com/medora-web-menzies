const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Writes still allowed while owner workspace is read-only. */
export const OWNER_READ_ONLY_WRITE_ALLOWLIST: readonly string[] = [
	'/api/auth',
	'/api/medora/auth/sign-out',
	'/api/medora/account',
	'/api/medora/account/two-factor',
	'/api/medora/account/password'
];

export function extractHospitalIdFromMedoraApi(
	pathname: string
): string | null {
	const match = pathname.match(/^\/api\/medora\/hospital\/([^/]+)/);
	if (!match?.[1]) return null;
	const id = match[1];
	if (id === 'undefined' || id === 'null') return null;
	return id;
}

export function isOwnerApiReadOnlyViolation(
	method: string,
	pathname: string
): boolean {
	if (!MUTATING_METHODS.has(method.toUpperCase())) return false;
	if (!pathname.startsWith('/api/medora')) return false;
	return !OWNER_READ_ONLY_WRITE_ALLOWLIST.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`)
	);
}
