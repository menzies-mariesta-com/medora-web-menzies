import { describe, expect, it } from 'vitest';
import {
	buildPricingInputsSnapshot,
	parsePatientChargePricingInputsSnapshot
} from '$lib/server/medora/inventory/patient-charge-pricing.server';
import type { PricingFormulaTemplateDto } from '$lib/model/type/medora/pricing-formula-template.type';

describe('patient charge pricing snapshot', () => {
	it('parses stored json inputs', () => {
		const snap = parsePatientChargePricingInputsSnapshot({
			formulaVersion: 2,
			itemMarkupPercent: '5.00',
			storeMarkupPercent: '3.00',
			mslMarkupPercent: '10.00'
		});
		expect(snap?.formulaVersion).toBe(2);
	});

	it('builds snapshot from template + markups', () => {
		const template = {
			id: 1,
			formulaVersion: 3,
			mslMarkupPercent: '12.50'
		} as PricingFormulaTemplateDto;
		const built = buildPricingInputsSnapshot({
			template,
			itemMarkupPercent: '1',
			storeMarkupPercent: '2'
		});
		expect(built.formulaVersion).toBe(3);
		expect(built.mslMarkupPercent).toBe('12.50');
	});
});
