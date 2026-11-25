import { describe, expect, it } from 'vitest';
import type { CarePlanContent } from '$lib/model/type/medora/clinical-platform.type';
import {
	starterCarePlanSchema,
	STARTER_CARE_PLAN_TEMPLATES
} from '$lib/server/medora/clinical/nursing-care-plan-template-definitions';
import { validateClinicalFormValues } from '$lib/server/medora/clinical-form/clinical-form-validation.util';

describe('STARTER_CARE_PLAN_TEMPLATES', () => {
	it('keys every template by a unique title, since seeding matches on title', () => {
		const titles = STARTER_CARE_PLAN_TEMPLATES.map(
			(tpl) => tpl.title
		);
		expect(new Set(titles).size).toBe(titles.length);
	});

	it('gives every starter a NANDA label and a filled problem field', () => {
		for (const tpl of STARTER_CARE_PLAN_TEMPLATES) {
			expect(tpl.nandaLabel.trim()).not.toBe('');
			expect(tpl.defaults.problem?.trim()).toBeTruthy();
			expect(tpl.defaults.goal?.trim()).toBeTruthy();
		}
	});

	it('builds defaults that pass sign validation unchanged', () => {
		for (const tpl of STARTER_CARE_PLAN_TEMPLATES) {
			const schema = starterCarePlanSchema(tpl.defaults);
			const result = validateClinicalFormValues(
				schema,
				tpl.defaults as Record<string, unknown>
			);
			expect(
				result,
				`${tpl.title}: ${JSON.stringify(result)}`
			).toEqual({
				ok: true
			});
		}
	});

	it('accepts a draft with only the problem filled', () => {
		const schema = starterCarePlanSchema(
			STARTER_CARE_PLAN_TEMPLATES[0].defaults
		);
		const draft: CarePlanContent = { problem: 'Risk for falls' };
		expect(
			validateClinicalFormValues(
				schema,
				draft as Record<string, unknown>,
				{
					skipRequired: true
				}
			)
		).toEqual({ ok: true });
	});
});
