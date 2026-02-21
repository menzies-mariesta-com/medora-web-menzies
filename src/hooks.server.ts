import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/auth/server';
import { ensureDb } from '$lib/server/db';
import { userTable } from '$lib/server/db/table/auth-table/auth-table';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getStaffByUserIdWithRelations } from '$lib/remote/table/information-table/staff.remote';
import { RoleEnum } from '$lib/model/enum/db-link';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});
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
		const staff = await getStaffByUserIdWithRelations({ userId: session.user.id });
		event.locals.staff = staff ?? null;
		if (event.locals.userRoleId === RoleEnum.STAFF && staff?.staffHospitals?.length) {
			event.locals.allowedHospitalIds = (staff.staffHospitals as { hospitalId: number }[]).map(
				(sh) => sh.hospitalId
			);
		} else {
			event.locals.allowedHospitalIds = null;
		}
	}

	return svelteKitHandler({
		event,
		resolve: (e) =>
			paraglideMiddleware(e.request, ({ request, locale }: { request: globalThis.Request; locale: string }) => {
				e.request = request;
				return resolve(e, {
					transformPageChunk: ({ html }) =>
						html.replace('%paraglide.lang%', locale)
				});
			}),
		auth,
		building
	});
};
