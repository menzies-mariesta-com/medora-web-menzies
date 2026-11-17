import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * The bell polls `/api/medora/notification?mode=unreadCount` on every page.
 * A signed-in user with no staff row must read as "no notifications", not 401:
 * the old throw logged a console error on every hospital screen.
 */
function eventWith(locals: Record<string, unknown>): RequestEvent {
	return { locals } as unknown as RequestEvent;
}

describe('notification recipient gate', () => {
	it('returns an empty bell for a signed-in user without a staff row', async () => {
		const { getNotificationUnreadCount, getNotificationsPaginated } =
			await import('./notification.server');
		const event = eventWith({ user: { id: 'u1' }, staff: null });

		await expect(getNotificationUnreadCount(event)).resolves.toBe(0);
		await expect(getNotificationsPaginated(event)).resolves.toEqual({
			data: [],
			total: 0,
			page: 1,
			pageSize: 10,
			totalPages: 1
		});
	});
});
