import type { RequestEvent } from '@sveltejs/kit';
import { doctorJson } from './doctor-api-response.server';

export const DOCTOR_API_PREFIX = '/api/doctor/v1';

/**
 * Clinical data in the doctor mobile app is read-only for this release.
 * Only the session bootstrap endpoints may mutate.
 */
const ALLOWED_WRITE_PATHS = new Set([
	`${DOCTOR_API_PREFIX}/auth/sign-in`,
	`${DOCTOR_API_PREFIX}/auth/sign-out`,
	`${DOCTOR_API_PREFIX}/auth/two-factor/verify`,
	`${DOCTOR_API_PREFIX}/auth/change-password`
]);

export function isDoctorApiReadOnlyViolation(
	method: string,
	pathname: string
): boolean {
	if (!pathname.startsWith(DOCTOR_API_PREFIX)) return false;
	if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
		return false;
	}
	return !ALLOWED_WRITE_PATHS.has(pathname);
}

export function doctorApiReadOnlyResponse(
	event: RequestEvent
): Response {
	return doctorJson(
		event,
		{ message: 'The doctor mobile API is read-only.' },
		{ status: 405 }
	);
}
