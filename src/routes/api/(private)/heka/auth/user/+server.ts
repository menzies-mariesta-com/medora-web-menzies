import { error, json, type RequestEvent } from '@sveltejs/kit';
import * as users from '$lib/server/heka/auth/user-admin.server';

export async function GET(event: RequestEvent) {
	const roleId = Number(event.url.searchParams.get('roleId') ?? '');
	if (!Number.isFinite(roleId)) throw error(400, 'roleId is required');
	if (event.url.searchParams.get('all') === '1') {
		return json(await users.listUsersByRole(event, roleId));
	}
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '20');
	const name = event.url.searchParams.get('name') ?? undefined;
	const email = event.url.searchParams.get('email') ?? undefined;
	const statusIdRaw = event.url.searchParams.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;
	return json(
		await users.getUsersByRolePaginated(event, {
			roleId,
			page,
			pageSize,
			name,
			email,
			statusId:
				statusId != null && Number.isFinite(statusId)
					? statusId
					: undefined
		})
	);
}

export async function DELETE(event: RequestEvent) {
	const id = event.url.searchParams.get('id') ?? '';
	if (!id) throw error(400, 'id is required');
	await users.deleteUserById(event, id);
	return json({ ok: true });
}

export async function POST(event: RequestEvent) {
	const body = await event.request.json();
	return json(
		await users.createOwner(event, {
			name: String(body?.name ?? ''),
			email: String(body?.email ?? '')
		})
	);
}

export async function PUT(event: RequestEvent) {
	const body = (await event.request.json()) as Record<string, unknown>;
	const id = String(body?.id ?? '');
	if (!id) throw error(400, 'id is required');
	const { id: _drop, ...rest } = body;
	return json(await users.updateUser(event, { id, ...rest } as any));
}
