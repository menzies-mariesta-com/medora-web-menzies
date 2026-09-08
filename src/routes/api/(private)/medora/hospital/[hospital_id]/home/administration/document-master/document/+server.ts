import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createDocument,
	deleteDocument,
	getDocumentsPaginatedWithRelations,
	updateDocument
} from '$lib/server/medora/document-master/document.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== ''
			? Number(statusIdStr)
			: null;

	const data = await getDocumentsPaginatedWithRelations(event, {
		hospitalId,
		page,
		pageSize,
		statusId: statusId ?? undefined
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const created = await createDocument(event, {
		hospitalId,
		documentTypeId: Number(body.documentTypeId),
		documentSettingId:
			body.documentSettingId === undefined
				? undefined
				: body.documentSettingId != null
					? Number(body.documentSettingId)
					: null,
		code: body.code != null ? String(body.code) : null,
		documentNumber:
			body.documentNumber != null
				? String(body.documentNumber)
				: null,
		documentText:
			body.documentText != null ? String(body.documentText) : null,
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
	const updated = await updateDocument(event, {
		hospitalId,
		id: Number(body.id),
		documentTypeId:
			body.documentTypeId === undefined
				? undefined
				: Number(body.documentTypeId),
		documentSettingId:
			body.documentSettingId === undefined
				? undefined
				: body.documentSettingId != null
					? Number(body.documentSettingId)
					: null,
		code:
			body.code === undefined
				? undefined
				: body.code != null
					? String(body.code)
					: null,
		documentNumber:
			body.documentNumber === undefined
				? undefined
				: body.documentNumber != null
					? String(body.documentNumber)
					: null,
		documentText:
			body.documentText === undefined
				? undefined
				: body.documentText != null
					? String(body.documentText)
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
	await deleteDocument(event, { hospitalId, id: Number(body.id) });
	return json({ ok: true });
};
