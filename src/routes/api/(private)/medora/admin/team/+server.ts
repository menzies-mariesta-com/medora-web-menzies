import { json, type RequestEvent } from '@sveltejs/kit';
import * as team from '$lib/server/medora/admin/admin-team.server';
import type {
	AdminTeamInvitePayload,
	AdminPagePermissionFlags
} from '$lib/model/type/medora/admin-team.type';

export async function GET(event: RequestEvent) {
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '20'
	);
	const name = event.url.searchParams.get('name') ?? undefined;
	const email = event.url.searchParams.get('email') ?? undefined;
	return json(
		await team.listAdminTeamPaginated(event, {
			page,
			pageSize,
			name,
			email
		})
	);
}

export async function POST(event: RequestEvent) {
	const body = (await event.request.json()) as Partial<AdminTeamInvitePayload>;
	const permissions = Array.isArray(body?.permissions)
		? (body.permissions as AdminPagePermissionFlags[])
		: [];
	return json(
		await team.inviteAdminTeamMember(event, {
			name: String(body?.name ?? ''),
			email: String(body?.email ?? ''),
			permissions
		})
	);
}
