import { error, json, type RequestEvent } from '@sveltejs/kit';
import * as notif from '$lib/server/heka/notification/notification.server';

export async function GET(event: RequestEvent) {
	const mode = event.url.searchParams.get('mode') ?? 'list';
	if (mode === 'unreadCount') {
		return json({
			count: await notif.getNotificationUnreadCount(event)
		});
	}
	if (mode !== 'list') throw error(400, 'Unknown mode');

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const read = (event.url.searchParams.get('read') ?? 'all') as
		| 'all'
		| 'unread'
		| 'read';
	return json(
		await notif.getNotificationsPaginated(event, {
			page,
			pageSize,
			read
		})
	);
}

export async function POST(event: RequestEvent) {
	const body = (await event.request.json().catch(() => null)) as {
		mode?: string;
		id?: number;
	} | null;
	const mode = String(body?.mode ?? '');
	if (mode === 'markRead') {
		const id = Number(body?.id ?? 0);
		if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
		await notif.markNotificationRead(event, { id });
		return json({ ok: true });
	}
	if (mode === 'markAllRead') {
		await notif.markAllNotificationsRead(event);
		return json({ ok: true });
	}
	throw error(400, 'Unknown mode');
}
