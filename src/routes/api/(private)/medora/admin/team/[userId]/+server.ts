import { error, json, type RequestEvent } from '@sveltejs/kit';
import * as team from '$lib/server/medora/admin/admin-team.server';
import type {
	AdminPagePermissionFlags,
	AdminTeamUpdatePayload
} from '$lib/model/type/medora/admin-team.type';

export async function GET(event: RequestEvent) {
	const userId = event.params.userId ?? '';
	if (!userId) throw error(400, 'userId is required');
	return json(await team.getAdminTeamMember(event, userId));
}

export async function PUT(event: RequestEvent) {
	const userId = event.params.userId ?? '';
	if (!userId) throw error(400, 'userId is required');
	const body = (await event.request.json()) as Partial<AdminTeamUpdatePayload>;
	const permissions = Array.isArray(body?.permissions)
		? (body.permissions as AdminPagePermissionFlags[])
		: [];
	return json(
		await team.updateAdminTeamMember(event, userId, {
			name:
				body?.name != null ? String(body.name) : undefined,
			permissions
		})
	);
}

export async function DELETE(event: RequestEvent) {
	const userId = event.params.userId ?? '';
	if (!userId) throw error(400, 'userId is required');
	await team.revokeAdminTeamMember(event, userId);
	return json({ ok: true });
}
