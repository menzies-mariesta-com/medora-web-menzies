import { describe, expect, it } from 'vitest';
import {
	isClinicalDocumentTypeId,
	parseClinicalDocumentSection
} from '$lib/model/constant/clinical-document-section.constant';
import { DocumentTypeId } from '$lib/model/constant/document-type-id.constant';
import { ClinicalDocumentSectionEnum } from '$lib/model/enum/clinical-document-section.enum';

describe('clinical-document-section', () => {
	it('requires clinical type id match', () => {
		expect(isClinicalDocumentTypeId(DocumentTypeId.CLINICAL_DOCUMENT)).toBe(
			true
		);
		expect(isClinicalDocumentTypeId(DocumentTypeId.CASE_SHEET_PRINT)).toBe(
			false
		);
	});

	it('parses allowed section keys', () => {
		expect(parseClinicalDocumentSection('consent')).toBe(
			ClinicalDocumentSectionEnum.CONSENT
		);
		expect(parseClinicalDocumentSection('invalid')).toBeNull();
	});
});