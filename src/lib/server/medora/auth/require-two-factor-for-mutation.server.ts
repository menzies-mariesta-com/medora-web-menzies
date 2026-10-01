import { json, type RequestEvent } from '@sveltejs/kit';
import { ApiErrorCodeEnum } from '$lib/model/enum/api-error.enum';
import { RoleEnum } from '$lib/model/enum/db-link';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isMedoraApiPath(pathname: string): boolean {
	return (
		pathname === '/api/medora' || pathname.startsWith('/api/medora/')
	);
}

/**
 * For SYSTEM_ADMIN, OWNER, and ADMIN_TEAM, mutating `/api/medora/**` requires 2FA enabled.
 * STAFF and unauthenticated callers are left to the endpoint (no gate here).
 * Returns a 403 Response when blocked; otherwise null.
 */
export function rejectMutatingMedoraApiWithoutTwoFactor(
	event: RequestEvent
): Response | null {
	if (!isMedoraApiPath(event.url.pathname)) return null;
	if (!MUTATING_METHODS.has(event.request.method.toUpperCase()))
		return null;

	const roleId = event.locals.userRoleId ?? null;
	if (
		roleId !== RoleEnum.SYSTEM_ADMIN &&
		roleId !== RoleEnum.OWNER &&
		roleId !== RoleEnum.ADMIN_TEAM
	) {
		return null;
	}

	if (event.locals.twoFactorEnabled) return null;

	return json(
		{
			code: ApiErrorCodeEnum.TWO_FACTOR_REQUIRED,
			message:
				'Two-factor authentication is required for this action.'
		},
		{ status: 403 }
	);
}
