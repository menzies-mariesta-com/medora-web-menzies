import type { ClinicalDocumentRow } from '$lib/model/type/medora/document-print.type';
import type { VisitLike } from '$lib/util/document-placeholder.util';

/** Safe PDF basename (no extension). */
export function sanitizeDownloadFileBase(raw: string): string {
	const out = raw
		.trim()
		.replace(/[^\p{L}\p{N}._-]+/gu, '-')
		.replace(/-+/g, '-')
		.replace(/^[-.]+|[-.]+$/g, '')
		.slice(0, 120);
	return out || 'document';
}

function patientDisplayName(visit?: VisitLike | null): string {
	const p = visit?.patient;
	if (!p) return '';
	return [p.firstName, p.middleName, p.lastName]
		.map((s) => s?.trim())
		.filter(Boolean)
		.join(' ')
		.trim();
}

/** Filename stem for Document Master prints: `{documentCode}_{patientName}`. */
export function buildDocumentMasterDownloadFileBase(
	masterDoc: ClinicalDocumentRow,
	visit?: VisitLike | null
): string {
	const docPart =
		masterDoc.code?.trim() ||
		masterDoc.documentNumber?.trim() ||
		'document';
	const name = patientDisplayName(visit);
	if (!name) return sanitizeDownloadFileBase(docPart);
	return sanitizeDownloadFileBase(`${docPart}_${name}`);
}