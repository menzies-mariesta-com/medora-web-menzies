import { json, type RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { updateStaffStatusForSelf } from '$lib/server/heka/administration/staff.server';

export async function PATCH(event: RequestEvent) {
	const body = (await event.request.json().catch(() => null)) as {
		staffId?: string;
		statusId?: number;
	} | null;
	const staffId = body?.staffId?.trim();
	const statusId = body?.statusId;
	if (!staffId || typeof statusId !== 'number') {
		throw error(400, 'staffId and statusId are required');
	}
	return json(
		await updateStaffStatusForSelf(event, { staffId, statusId })
	);
}
