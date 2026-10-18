import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAdminIcdCodesPaginated,
	reseedAdminIcdCodes
} from '$lib/server/medora/admin/admin-icd.server';

export const GET: RequestHandler = async (event) => {
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '20'
	);
	const system = event.url.searchParams.get('system');
	const code = event.url.searchParams.get('code');
	const description = event.url.searchParams.get('description');
	const search = event.url.searchParams.get('search');
	const statusRaw = event.url.searchParams.get('statusId');
	const statusId =
		statusRaw != null && statusRaw !== ''
			? Number(statusRaw)
			: undefined;

	const result = await getAdminIcdCodesPaginated(event, {
		page,
		pageSize,
		system,
		code,
		description,
		search,
		statusId:
			statusId != null && Number.isFinite(statusId)
				? statusId
				: undefined
	});
	return json(result);
};

export const POST: RequestHandler = async (event) => {
	let body: { system?: string | null } = {};
	try {
		body = (await event.request.json()) as { system?: string | null };
	} catch {
		body = {};
	}
	const result = await reseedAdminIcdCodes(event, {
		system: body.system ?? null
	});
	return json(result);
};
