import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getGlobalDocumentPreview,
	linkGlobalDocumentToHospital,
	listGlobalDocumentsForHospitalLink,
	unlinkGlobalDocumentFromHospital
} from '$lib/server/medora/document-master/global-document-link.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const documentIdRaw = event.url.searchParams.get('documentId');
	if (documentIdRaw != null && documentIdRaw !== '') {
		const preview = await getGlobalDocumentPreview(
			event,
			hospitalId,
			Number(documentIdRaw)
		);
		return json(preview);
	}
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '20');
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== ''
			? Number(statusIdStr)
			: null;

	const data = await listGlobalDocumentsForHospitalLink(event, hospitalId, {
		page,
		pageSize,
		statusId: statusId ?? undefined
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const row = await linkGlobalDocumentToHospital(event, {
		hospitalId,
		documentId: Number(body.documentId),
		documentTypeId: Number(body.documentTypeId),
		documentSettingId: Number(body.documentSettingId),
		locale: body.locale != null ? String(body.locale) : undefined
	});
	return json(row);
};

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	await unlinkGlobalDocumentFromHospital(event, {
		hospitalId,
		documentId: Number(body.documentId)
	});
	return json({ ok: true });
};
