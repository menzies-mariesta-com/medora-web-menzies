import { describe, expect, it } from 'vitest';
import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
import { validateClinicalFormValues } from './clinical-form-validation.util';

const injurySchema: ClinicalFormTemplateSchema = {
	sections: [
		{
			id: 'examination',
			type: 'section',
			label: 'Examination',
			sectionFields: [
				{
					id: 'exam_injuries',
					type: 'table',
					label: 'Injuries',
					required: true,
					columns: [
						{ id: 'region', label: 'Region', type: 'text' },
						{
							id: 'nature',
							label: 'Nature',
							type: 'enum',
							options: [
								{ value: 'abrasion', label: 'Abrasion' },
								{ value: 'laceration', label: 'Laceration' }
							]
						}
					]
				}
			]
		}
	]
};

describe('validateClinicalFormValues — table fields', () => {
	it('rejects a required table with no rows', () => {
		const result = validateClinicalFormValues(injurySchema, {
			exam_injuries: []
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toContain('required');
	});

	it('rejects a required table whose rows are all blank', () => {
		const result = validateClinicalFormValues(injurySchema, {
			exam_injuries: [{ region: '', nature: ' ' }]
		});
		expect(result.ok).toBe(false);
	});

	it('accepts a row with at least one filled cell', () => {
		const result = validateClinicalFormValues(injurySchema, {
			exam_injuries: [{ region: 'Left forearm', nature: '' }]
		});
		expect(result.ok).toBe(true);
	});

	it('rejects an enum cell outside the column options', () => {
		const result = validateClinicalFormValues(injurySchema, {
			exam_injuries: [{ region: 'Head', nature: 'gunshot' }]
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toContain('Nature');
	});

	it('accepts an allowed enum cell and ignores blank enum cells', () => {
		expect(
			validateClinicalFormValues(injurySchema, {
				exam_injuries: [{ region: 'Head', nature: 'laceration' }]
			}).ok
		).toBe(true);
		expect(
			validateClinicalFormValues(injurySchema, {
				exam_injuries: [{ region: 'Head', nature: '' }]
			}).ok
		).toBe(true);
	});

	it('ignores a malformed (non-array) table value rather than throwing', () => {
		const result = validateClinicalFormValues(injurySchema, {
			exam_injuries: 'not-a-table'
		});
		expect(result.ok).toBe(false);
	});

	it('treats a table as one field, not as flattened scalar cells', () => {
		// Region is not a top-level required field; only the table itself is.
		const result = validateClinicalFormValues(injurySchema, {
			exam_injuries: [{ nature: 'abrasion' }]
		});
		expect(result.ok).toBe(true);
	});

	it('skips required checks for drafts but still checks enum cells', () => {
		expect(
			validateClinicalFormValues(
				injurySchema,
				{ exam_injuries: [] },
				{ skipRequired: true }
			).ok
		).toBe(true);
		expect(
			validateClinicalFormValues(
				injurySchema,
				{ exam_injuries: [{ region: 'Head', nature: 'gunshot' }] },
				{ skipRequired: true }
			).ok
		).toBe(false);
	});
});
