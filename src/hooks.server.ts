import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building } from '$app/environment';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/auth/server';
import { ensureDb } from '$lib/server/db';
import { userTable } from '$lib/server/db/table/auth-table/auth-table';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { getStaffByUserIdWithRelationsCached } from '$lib/server/medora/staff-session-cache.server';
import type { StaffSessionRow } from '$lib/model/type/medora/staff.type';
import { RoleEnum } from '$lib/model/enum/db-link';
import { rejectMutatingMedoraApiWithoutTwoFactor } from '$lib/server/medora/auth/require-two-factor-for-mutation.server';
import { loadAdminPagePermissions } from '$lib/server/medora/admin/admin-permission.server';
import { redirect } from '@sveltejs/kit';
import { applySecurityHeaders } from '$lib/server/http/security-headers.server';

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;
	if (pathname === '/heka' || pathname.startsWith('/heka/')) {
		const rest = pathname === '/heka' ? '' : pathname.slice('/heka'.length);
		throw redirect(302, `/medora${rest}${event.url.search}`);
	}
	if (pathname === '/api/heka' || pathname.startsWith('/api/heka/')) {
		const rest =
			pathname === '/api/heka' ? '' : pathname.slice('/api/heka'.length);
		throw redirect(302, `/api/medora${rest}${event.url.search}`);
	}

	let session: Awaited<ReturnType<typeof auth.api.getSession>>;
	try {
		session = await auth.api.getSession({
			headers: event.request.headers
		});
	} catch (err) {
		console.error('[auth] Failed to get session', err);
		session = null;
	}

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
		const [userRow] = await ensureDb()
			.select({
				roleId: userTable.roleId,
				twoFactorEnabled: userTable.twoFactorEnabled
			})
			.from(userTable)
			.where(eq(userTable.id, session.user.id))
			.limit(1);
		event.locals.userRoleId = userRow?.roleId ?? null;
		event.locals.twoFactorEnabled = Boolean(
			userRow?.twoFactorEnabled
		);
		if (event.locals.userRoleId === RoleEnum.ADMIN_TEAM) {
			try {
				event.locals.adminPermissions =
					await loadAdminPagePermissions(session.user.id);
			} catch (err) {
				console.error('[admin] Failed to load page permissions', err);
				event.locals.adminPermissions = [];
			}
		} else if (event.locals.userRoleId === RoleEnum.SYSTEM_ADMIN) {
			event.locals.adminPermissions = null;
		} else {
			event.locals.adminPermissions = undefined;
		}
		let staff: Awaited<
			ReturnType<typeof getStaffByUserIdWithRelationsCached>
		> | null = null;
		try {
			staff = await getStaffByUserIdWithRelationsCached(
				session.user.id
			);
		} catch (err) {
			console.error('[staff] Failed to load staff by user id', err);
			staff = null;
		}
		event.locals.staff = (staff ?? null) as StaffSessionRow | null;
		if (
			event.locals.userRoleId === RoleEnum.STAFF &&
			staff?.staffHospitals?.length
		) {
			event.locals.allowedHospitalIds = (
				staff.staffHospitals as { hospitalId: string }[]
			).map((sh) => sh.hospitalId);
		} else {
			event.locals.allowedHospitalIds = null;
		}
	}

	const twoFactorGate = rejectMutatingMedoraApiWithoutTwoFactor(event);
	if (twoFactorGate) return applySecurityHeaders(twoFactorGate, event);

	const basePath =
		(auth as { options?: { basePath?: string } }).options?.basePath ??
		'/api/auth';
	const authPrefix = basePath.endsWith('/')
		? basePath
		: `${basePath}/`;

	if (
		!building &&
		(pathname === basePath || pathname.startsWith(authPrefix))
	) {
		const authResponse = await auth.handler(event.request);
		return applySecurityHeaders(authResponse, event);
	}

	return paraglideMiddleware(
		event.request,
		({
			request,
			locale
		}: {
			request: globalThis.Request;
			locale: string;
		}) => {
			event.request = request;
			return resolve(event, {
				transformPageChunk: ({ html }) =>
					html.replace('%paraglide.lang%', locale)
			}).then((response) => applySecurityHeaders(response, event));
		}
	);
};

export const handleError: HandleServerError = ({
	error,
	event,
	status,
	message
}) => {
	console.error('[handleError]', {
		url: event.url.pathname,
		status,
		message,
		error
	});
	return { message: message || 'Unexpected error' };
};
