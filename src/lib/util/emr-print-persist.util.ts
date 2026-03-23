import { createPatientAttachment } from '$lib/remote/table/information-table/patient-attachment.remote';
import { createPatientDocument } from '$lib/remote/table/information-table/patient-document.remote';
import { deletePatientAttachmentComplete } from '$lib/remote/table/information-table/patient-attachment.remote';
import { StatusEnum } from '$lib/model/enum/db-link';

/**
 * Stores PDF in patient_attachment and tags patient_document with optional FK.
 * Rolls back attachment row if patient_document insert fails.
 */
export async function persistEmrPrintPdf(params: {
	patientId: string;
	visitId: number;
	documentId: number;
	fileUrl: string;
	attachmentDescription: string;
}): Promise<void> {
	const attachment = await createPatientAttachment({
		patientId: params.patientId,
		fileUrl: params.fileUrl,
		description: params.attachmentDescription,
		statusId: StatusEnum.ACTIVE
	});
	try {
		await createPatientDocument({
			visitId: params.visitId,
			patientId: params.patientId,
			documentId: params.documentId,
			patientAttachmentId: attachment.id,
			statusId: StatusEnum.ACTIVE
		});
	} catch (err) {
		try {
			await deletePatientAttachmentComplete({ id: attachment.id });
		} catch {
			// best-effort cleanup
		}
		throw err;
	}
}
