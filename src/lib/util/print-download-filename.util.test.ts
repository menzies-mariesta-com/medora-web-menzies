import { describe, expect, it } from 'vitest';
import {
	buildDocumentMasterDownloadFileBase,
	sanitizeDownloadFileBase
} from '$lib/util/print-download-filename.util';

describe('print-download-filename.util', () => {
	it('sanitizes unsafe characters', () => {
		expect(sanitizeDownloadFileBase('Bill / OP #1')).toBe('Bill-OP-1');
	});

	it('builds document code and patient name stem', () => {
		expect(
			buildDocumentMasterDownloadFileBase(
				{
					id: 1,
					documentNumber: 'BILL-001',
					code: 'bill_print'
				},
				{
					patient: {
						firstName: 'Aung',
						middleName: 'Kaung',
						lastName: 'Myat'
					}
				}
			)
		).toBe('bill_print_Aung-Kaung-Myat');
	});
});