import { and, desc, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from './require-patient-context.server';

/** Storage key inside Tigris, derived from the stored `/api/patient-attachment/...` URL. */
export function patientAttachmentStorageKey(
	fileUrl: string | null
): string | null {
	if (!fileUrl) return null;
	const marker = '/api/patient-attachment/';
	const index = fileUrl.indexOf(marker);
	if (index < 0) return null;
	const key = fileUrl.slice(index + marker.length);
	if (!key || key.includes('..')) return null;
	return key.startsWith('patient-attachments/') ? key : null;
}

export async function listPatientDocuments(
	ctx: PatientPortalContext
) {
	const rows = await ensureDb().query.patientAttachmentTable.findMany(
		{
			where: and(
				eq(table.patientAttachmentTable.patientId, ctx.patientId),
				ne(table.patientAttachmentTable.statusId, StatusEnum.DELETED)
			),
			orderBy: desc(table.patientAttachmentTable.createdAt)
		}
	);

	// Never expose storage paths or raw attachment rows. The client fetches the
	// bytes through the authenticated content endpoint below.
	return rows.map((row) => ({
		id: row.id,
		description: row.description,
		createdAt: row.createdAt,
		contentType: row.fileUrl
			? contentTypeFromStorageKey(row.fileUrl)
			: null,
		contentUrl: `${PATIENT_DOCUMENT_CONTENT_PREFIX}/${row.id}/content`
	}));
}

export const PATIENT_DOCUMENT_CONTENT_PREFIX =
	'/api/patient/v1/documents';

export function contentTypeFromStorageKey(key: string): string {
	const ext = key.split('.').pop()?.toLowerCase() ?? '';
	switch (ext) {
		case 'pdf':
			return 'application/pdf';
		case 'png':
			return 'image/png';
		case 'webp':
			return 'image/webp';
		case 'gif':
			return 'image/gif';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		default:
			return 'application/octet-stream';
	}
}

export async function getPatientDocument(
	ctx: PatientPortalContext,
	documentId: number
) {
	const row = await ensureDb().query.patientAttachmentTable.findFirst(
		{
			where: and(
				eq(table.patientAttachmentTable.id, documentId),
				eq(table.patientAttachmentTable.patientId, ctx.patientId),
				ne(table.patientAttachmentTable.statusId, StatusEnum.DELETED)
			)
		}
	);
	if (!row) return null;
	const storageKey = patientAttachmentStorageKey(row.fileUrl);
	if (!storageKey) return null;
	return {
		id: row.id,
		description: row.description,
		createdAt: row.createdAt,
		storageKey,
		contentType: contentTypeFromStorageKey(storageKey)
	};
}
