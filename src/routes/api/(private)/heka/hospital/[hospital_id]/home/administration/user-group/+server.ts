import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	createUserGroup,
	deleteUserGroup,
	getUserGroupById,
	getUserGroupPageAssignments,
	getUserGroupsPaginated,
	setPagesForUserGroup,
	updateUserGroup
} from '$lib/server/heka/administration/user-group/user-group.server';
import { StatusEnum } from '$lib/model/enum/db-link';

export const GET: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');

	const mode = event.url.searchParams.get('mode') ?? 'paginated';
	if (mode === 'pages') {
		const userGroupIdStr = event.url.searchParams.get('userGroupId');
		const userGroupId =
			userGroupIdStr != null && userGroupIdStr !== ''
				? Number(userGroupIdStr)
				: NaN;
		if (!Number.isFinite(userGroupId))
			throw error(400, 'Missing userGroupId');

		const data = await getUserGroupPageAssignments(event, {
			hospitalId,
			userGroupId
		});
		return json({
			pages: data.pages,
			modules: data.modules,
			assignedPageIds: data.assignments
				.map((a) => a.pageId)
				.filter((id): id is number => id != null)
		});
	}

	const idStr = event.url.searchParams.get('id');
	if (idStr) {
		const id = Number(idStr);
		if (!Number.isFinite(id)) throw error(400, 'Invalid id');
		const data = await getUserGroupById(event, { id });
		return json(data);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const name = event.url.searchParams.get('name');
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== '' ? Number(statusIdStr) : undefined;

	const data = await getUserGroupsPaginated(event, {
		hospitalId,
		page,
		pageSize,
		name: name != null && name !== '' ? name : undefined,
		statusId
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');

	const body = (await event.request.json()) as Record<string, unknown>;
	const name = String(body.name ?? '').trim();
	if (!name) throw error(400, 'Name is required');

	const statusIdRaw = body.statusId;
	const statusId =
		typeof statusIdRaw === 'number'
			? statusIdRaw
			: statusIdRaw != null
				? Number(statusIdRaw)
				: StatusEnum.ACTIVE;

	const created = await createUserGroup(event, {
		hospitalId,
		name,
		statusId
	});
	return json(created);
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');

	const mode = event.url.searchParams.get('mode') ?? '';
	const body = (await event.request.json()) as Record<string, unknown>;

	if (mode === 'pages') {
		const userGroupIdRaw = body.userGroupId;
		const userGroupId =
			typeof userGroupIdRaw === 'number'
				? userGroupIdRaw
				: Number(userGroupIdRaw);
		if (!Number.isFinite(userGroupId))
			throw error(400, 'Invalid userGroupId');

		const pageIdsRaw = body.pageIds;
		const pageIds = Array.isArray(pageIdsRaw)
			? pageIdsRaw
					.map((x) => Number(x))
					.filter((n) => Number.isFinite(n))
			: [];

		await setPagesForUserGroup(event, {
			hospitalId,
			userGroupId,
			pageIds
		});
		return json({ ok: true });
	}

	const idRaw = body.id;
	const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
	if (!Number.isFinite(id)) throw error(400, 'Invalid id');

	const updated = await updateUserGroup(event, {
		id,
		name:
			body.name === undefined
				? undefined
				: body.name != null
					? String(body.name)
					: null,
		statusId:
			body.statusId === undefined
				? undefined
				: body.statusId != null
					? Number(body.statusId)
					: undefined
	});
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const idRaw = body.id;
	const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
	if (!Number.isFinite(id)) throw error(400, 'Invalid id');
	await deleteUserGroup(event, { id });
	return json({ ok: true });
};

