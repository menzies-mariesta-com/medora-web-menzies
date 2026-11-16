import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getDocumentTypes,
	getDocumentTypesPaginated
} from '$lib/server/medora/document-master/document-type.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const pageStr = event.url.searchParams.get('page');
	const pageSizeStr = event.url.searchParams.get('pageSize');
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== ''
			? Number(statusIdStr)
			: null;

	// If caller sends pagination params, return paginated. Otherwise return full list (for dropdowns).
	if (pageStr != null || pageSizeStr != null || statusIdStr != null) {
		const data = await getDocumentTypesPaginated(event, {
			hospitalId,
			page: Number(pageStr ?? '1'),
			pageSize: Number(pageSizeStr ?? '10'),
			statusId: statusId ?? undefined
		});
		return json(data);
	}

	const data = await getDocumentTypes(event, { hospitalId });
	return json(data);
};

export const POST: RequestHandler = async () => {
	throw error(403, 'Document purposes are fixed; create is disabled.');
};

export const PUT: RequestHandler = async () => {
	throw error(403, 'Document purposes are fixed; update is disabled.');
};

export const DELETE: RequestHandler = async () => {
	throw error(403, 'Document purposes are fixed; delete is disabled.');
};
