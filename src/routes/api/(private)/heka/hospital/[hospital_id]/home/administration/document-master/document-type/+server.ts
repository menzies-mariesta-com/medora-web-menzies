import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createDocumentType,
	deleteDocumentType,
	getDocumentTypes,
	getDocumentTypesPaginated,
	updateDocumentType
} from '$lib/server/heka/document-master/document-type.server';

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

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const created = await createDocumentType(event, {
		hospitalId,
		documentType:
			body.documentType != null ? String(body.documentType) : null,
		statusId:
			body.statusId != null ? Number(body.statusId) : undefined
	});
	return json(created);
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const updated = await updateDocumentType(event, {
		hospitalId,
		id: Number(body.id),
		documentType:
			body.documentType === undefined
				? undefined
				: body.documentType != null
					? String(body.documentType)
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
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	await deleteDocumentType(event, {
		hospitalId,
		id: Number(body.id)
	});
	return json({ ok: true });
};
