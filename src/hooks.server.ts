import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import { staffTable } from '$lib/server/db/table/information-table/information-table';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
		// Load staff linked to this user (1:1)
		const [staff] = await db
			.select()
			.from(staffTable)
			.where(eq(staffTable.userId, session.user.id))
			.limit(1);
		event.locals.staff = staff ?? null;
	}

	return svelteKitHandler({
		event,
		resolve: (e) =>
			paraglideMiddleware(e.request, ({ request, locale }) => {
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
