import { describe, expect, it } from 'vitest';
import { normalizePrintContext } from '$lib/util/document-placeholder.util';

describe('normalizePrintContext', () => {
	it('fills missing data with dash and merges text placeholders', () => {
		const ctx = normalizePrintContext({
			visit: null,
			document: { documentNumber: 'Test' },
			textPlaceholders: { thank: 'Thanks for choosing our hospital.' }
		});
		expect(ctx['{{patient_code}}']).toBe('-');
		expect(ctx['{{visit_code}}']).toBe('-');
		expect(ctx['{{thank}}']).toBe('Thanks for choosing our hospital.');
	});

	it('maps dotted extra placeholders onto flat template tokens', () => {
		const ctx = normalizePrintContext({
			visit: null,
			document: { documentNumber: 'Case sheet' },
			extraPlaceholders: {
				'{{print.body_html}}': '<p>EMR body</p>'
			}
		});
		expect(ctx['{{print_body_html}}']).toBe('<p>EMR body</p>');
	});

	it('maps dotted appointment extras onto flat template tokens', () => {
		const ctx = normalizePrintContext({
			visit: null,
			document: { documentNumber: 'Appointment slip' },
			extraPlaceholders: {
				'{{appointment.patient}}': 'P-1 Jane',
				'{{appointment.doctor}}': 'Dr Smith'
			}
		});
		expect(ctx['{{appointment_patient}}']).toBe('P-1 Jane');
		expect(ctx['{{appointment_doctor}}']).toBe('Dr Smith');
	});
});
