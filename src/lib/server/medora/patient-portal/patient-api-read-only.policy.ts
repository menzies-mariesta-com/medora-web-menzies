/**
 * Pure policy for the information-only patient API. Kept free of SvelteKit
 * imports so it can be unit-tested in isolation.
 */
export const PATIENT_API_PREFIX = '/api/patient/v1';

export const PATIENT_API_ALLOWED_WRITE_PATHS = new Set([
	`${PATIENT_API_PREFIX}/auth/sign-in`,
	`${PATIENT_API_PREFIX}/auth/change-password`,
	`${PATIENT_API_PREFIX}/auth/refresh`,
	`${PATIENT_API_PREFIX}/devices`
]);

export function isPatientApiReadOnlyViolation(
	method: string,
	pathname: string
): boolean {
	if (
		pathname !== PATIENT_API_PREFIX &&
		!pathname.startsWith(`${PATIENT_API_PREFIX}/`)
	) {
		return false;
	}
	if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
		return false;
	}
	return !PATIENT_API_ALLOWED_WRITE_PATHS.has(pathname);
}
