import { describe, expect, it } from 'vitest';
import { VisitTypeEnum } from '$lib/model/enum/db-link';
import { billingApiSegmentForVisitType } from './billing-api-segment.util';

describe('billingApiSegmentForVisitType', () => {
	it('uses ip-billing for IPD', () => {
		expect(billingApiSegmentForVisitType(VisitTypeEnum.IPD)).toBe(
			'ip-billing'
		);
	});

	it('uses er-billing for ED', () => {
		expect(billingApiSegmentForVisitType(VisitTypeEnum.ED)).toBe(
			'er-billing'
		);
	});

	it('uses op-billing for OPD and unknown types', () => {
		expect(billingApiSegmentForVisitType(VisitTypeEnum.OPD)).toBe(
			'op-billing'
		);
		expect(billingApiSegmentForVisitType(null)).toBe('op-billing');
	});
});
