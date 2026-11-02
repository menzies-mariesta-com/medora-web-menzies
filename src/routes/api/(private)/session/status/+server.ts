import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Read-only session expiry for footer countdown / keepalive (does not extend). */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || !locals.session) {
		throw error(401, 'Unauthorized');
	}
	return json({
		expiresAt: locals.session.expiresAt ?? null,
		sessionId: locals.session.id ?? null
	});
};
