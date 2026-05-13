import { StatusEnum } from '$lib/model/enum/db-link';

/**
 * Stores PDF in patient_attachment and tags patient_document with optional FK.
 * Rolls back attachment row if patient_document insert fails.
 */
export async function persistEmrPrintPdf(params: {
	hospitalId: string;
	patientId: string;
	visitId: number;
	documentId: number;
	fileUrl: string;
	attachmentDescription: string;
}): Promise<void> {
	const base = `/api/heka/hospital/${encodeURIComponent(params.hospitalId)}/home/nursing-workbench/emr`;

	const attachRes = await fetch(`${base}/patient-attachment`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			patientId: params.patientId,
			fileUrl: params.fileUrl,
			description: params.attachmentDescription
		})
	});
	if (!attachRes.ok) {
		const text = await attachRes.text().catch(() => '');
		throw new Error(
			text || `Attachment save failed: ${attachRes.status}`
		);
	}
	const attachJson = (await attachRes.json()) as {
		data?: { id: number };
	};
	const attachmentId = attachJson.data?.id;
	if (attachmentId == null) throw new Error('Attachment id missing');

	try {
		const docRes = await fetch(`${base}/clinical-document`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				mode: 'patientDocument.create',
				payload: {
					visitId: params.visitId,
					patientId: params.patientId,
					documentId: params.documentId,
					patientAttachmentId: attachmentId,
					statusId: StatusEnum.ACTIVE
				}
			})
		});
		if (!docRes.ok) {
			const text = await docRes.text().catch(() => '');
			throw new Error(
				text || `Patient document save failed: ${docRes.status}`
			);
		}
	} catch (err) {
		try {
			await fetch(
				`${base}/patient-attachment?id=${encodeURIComponent(String(attachmentId))}`,
				{ method: 'DELETE', credentials: 'include' }
			);
		} catch {
			// best-effort cleanup
		}
		throw err;
	}
}
