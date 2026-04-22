import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/auth/server';
import { ensureDb } from '$lib/server/db';
import { userTable } from '$lib/server/db/table/auth-table/auth-table';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { getStaffByUserIdWithRelations } from '$lib/server/heka/administration/staff.server';
import type { StaffSessionRow } from '$lib/model/type/heka/staff.type';
import { RoleEnum } from '$lib/model/enum/db-link';

export const handle: Handle = async ({ event, resolve }) => {
	let session: Awaited<ReturnType<typeof auth.api.getSession>>;
	try {
		session = await auth.api.getSession({
			headers: event.request.headers
		});
	} catch (err) {
		// If the DB is temporarily unreachable (DNS/network), Better Auth should not
		// crash the whole request with a 500. Treat the user as logged out.
		console.error('[auth] Failed to get session', err);
		session = null;
	}

	// Expiry is enforced by Better Auth from the session row `expires_at` (including
	// the one-time +30m extension in `/api/session/extend`). Do not cap by
	// `created_at` or extensions would still log the user out at T+30m.
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
		// User role (for STAFF vs OWNER/SYSTEM_ADMIN)
		const [userRow] = await ensureDb()
			.select({ roleId: userTable.roleId })
			.from(userTable)
			.where(eq(userTable.id, session.user.id))
			.limit(1);
		event.locals.userRoleId = userRow?.roleId ?? null;
		// Load staff linked to this user (1:1); for STAFF, derive allowed hospitals
		let staff: Awaited<ReturnType<typeof getStaffByUserIdWithRelations>> | null =
			null;
		try {
			staff = await getStaffByUserIdWithRelations(session.user.id);
		} catch (err) {
			// Staff lookup should never take the whole request down (favicon, auth redirects, etc.)
			// This can fail if seed data isn't present yet or DB connectivity is flaky.
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

	const basePath =
		(auth as { options?: { basePath?: string } }).options?.basePath ??
		'/api/auth';
	const pathname = event.url.pathname;
	const authPrefix = basePath.endsWith('/') ? basePath : `${basePath}/`;

	// Better Auth's `svelteKitHandler` checks request origin against `baseURL`.
	// When you access the app via different hosts (e.g. `localhost` vs LAN IP),
	// that origin check can fail and SvelteKit will return 404 for `/api/auth/*`.
	// Here we route by pathname only to keep auth endpoints working as expected.
	if (!building && (pathname === basePath || pathname.startsWith(authPrefix))) {
		return auth.handler(event.request);
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
			});
		}
	);
};
