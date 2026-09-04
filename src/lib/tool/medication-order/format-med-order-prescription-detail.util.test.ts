import { describe, expect, it } from 'vitest';
import type { MedicationOrderMastersResponse } from '$lib/model/type/heka/medication-order.type';
import {
	formatMedOrderPrescriptionDetail,
	formatMedOrderStartDate
} from './format-med-order-prescription-detail.util';

const masters: MedicationOrderMastersResponse = {
	forms: [],
	routes: [{ id: 1, name: 'Oral' }],
	orderTypes: [{ id: 1, name: 'STAT' }],
	doseUnits: [
		{ id: 1, name: 'Tablet' },
		{ id: 2, name: 'gm' }
	],
	foodRels: [{ id: 1, name: 'after breakfast' }],
	durUnits: [
		{ id: 1, code: 'day', name: 'Day' },
		{ id: 2, code: 'month', name: 'Month' }
	],
	freqs: [
		{ id: 1, label: '2 times a Day (BD)', summaryText: null },
		{ id: 2, label: 'Once a Day (CM)', summaryText: null }
	]
};

describe('format-med-order-prescription-detail', () => {
	it('formats routine oral line', () => {
		const out = formatMedOrderPrescriptionDetail(
			{
				dose: '1',
				doseUnitId: 1,
				frequencyId: 1,
				durationValue: '2',
				durationUnitId: 1,
				routeId: 1,
				orderTypeId: null,
				foodRelationId: null,
				startAt: '2026-05-30T10:00:00.000Z'
			},
			masters
		);
		expect(out).toContain('1 Tablet(s)');
		expect(out).toContain('2 times a Day (BD)');
		expect(out).toContain('for 2 Day(s)');
		expect(out).toContain('(PO)');
		expect(out).toContain('Start Date:');
	});

	it('formats STAT line', () => {
		const out = formatMedOrderPrescriptionDetail(
			{
				dose: '1',
				doseUnitId: 2,
				frequencyId: 1,
				durationValue: '1',
				durationUnitId: 1,
				routeId: 1,
				orderTypeId: 1,
				foodRelationId: null,
				startAt: '2026-05-31T08:00:00.000Z'
			},
			masters
		);
		expect(out.startsWith('STAT -')).toBe(true);
		expect(out).toContain('1 gm');
	});

	it('formats start date as DD/MM/YYYY', () => {
		expect(formatMedOrderStartDate('2026-03-08T12:00:00.000Z')).toMatch(
			/^08\/03\/2026$/
		);
	});
});
