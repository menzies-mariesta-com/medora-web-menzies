import { DocumentTypeId } from '$lib/model/constant/document-type-id.constant';
import {
	ClinicalDocumentSectionEnum,
	parseClinicalDocumentSection
} from '$lib/model/enum/clinical-document-section.enum';

export type ClinicalDocumentSectionOption = {
	value: ClinicalDocumentSectionEnum;
	label: string;
	description: string;
};

export const CLINICAL_DOCUMENT_SECTION_OPTIONS: ClinicalDocumentSectionOption[] =
	[
		{
			value: ClinicalDocumentSectionEnum.CONSENT,
			label: 'Consent form',
			description: 'Shown under Consent Forms on Clinical Document'
		},
		{
			value: ClinicalDocumentSectionEnum.INSTRUCTION,
			label: 'Instruction form',
			description: 'Shown under Instruction Forms on Clinical Document'
		},
		{
			value: ClinicalDocumentSectionEnum.FORM,
			label: 'General form',
			description: 'Shown under Forms on Clinical Document'
		},
		{
			value: ClinicalDocumentSectionEnum.CERTIFICATE,
			label: 'Certificate',
			description:
				'Shown under Forms on Clinical Document (with general forms)'
		}
	];

export { parseClinicalDocumentSection };

export function isClinicalDocumentTypeId(
	documentTypeId: number | null | undefined
): boolean {
	return documentTypeId === DocumentTypeId.CLINICAL_DOCUMENT;
}

export function clinicalSectionLabel(
	value: ClinicalDocumentSectionEnum | string | null | undefined
): string {
	if (!value) return '—';
	const found = CLINICAL_DOCUMENT_SECTION_OPTIONS.find(
		(o) => o.value === value
	);
	return found?.label ?? String(value);
}