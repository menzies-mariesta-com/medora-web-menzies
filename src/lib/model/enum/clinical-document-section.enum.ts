/** Sub-section for CLINICAL_DOCUMENT purpose only (stored in `document.clinical_section`). */
export enum ClinicalDocumentSectionEnum {
	CONSENT = 'consent',
	INSTRUCTION = 'instruction',
	FORM = 'form',
	CERTIFICATE = 'certificate'
}

export const CLINICAL_DOCUMENT_SECTION_VALUES = Object.values(
	ClinicalDocumentSectionEnum
) as ClinicalDocumentSectionEnum[];

const VALUE_SET = new Set<string>(CLINICAL_DOCUMENT_SECTION_VALUES);

export function isClinicalDocumentSection(
	value: unknown
): value is ClinicalDocumentSectionEnum {
	if (typeof value !== 'string') return false;
	return VALUE_SET.has(value);
}

export function parseClinicalDocumentSection(
	value: unknown
): ClinicalDocumentSectionEnum | null {
	if (value == null) return null;
	const v = String(value).trim();
	if (!v || !VALUE_SET.has(v)) return null;
	return v as ClinicalDocumentSectionEnum;
}