import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getDocumentPrintBootstrap,
	listDocumentPrintOptions
} from '$lib/server/medora/document-master/document-print.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? 'bootstrap';

	if (mode === 'options') {
		const documentTypeId = Number(event.url.searchParams.get('documentTypeId') ?? '');
		if (!Number.isFinite(documentTypeId) || documentTypeId <= 0) {
			throw error(400, 'documentTypeId is required');
		}
		return json(await listDocumentPrintOptions(event, hospitalId, documentTypeId));
	}

	if (mode !== 'bootstrap') throw error(400, `Unknown mode: ${mode}`);

	const code = event.url.searchParams.get('code') ?? undefined;
	const documentTypeIdStr = event.url.searchParams.get('documentTypeId');
	const documentTypeId =
		documentTypeIdStr != null && documentTypeIdStr !== ''
			? Number(documentTypeIdStr)
			: undefined;
	const documentIdStr = event.url.searchParams.get('documentId');
	const documentId =
		documentIdStr != null && documentIdStr !== ''
			? Number(documentIdStr)
			: undefined;

	return json(
		await getDocumentPrintBootstrap(event, hospitalId, {
			code,
			documentTypeId:
				documentTypeId != null && Number.isFinite(documentTypeId)
					? documentTypeId
					: undefined,
			documentId
		})
	);
}
