import { describe, expect, it } from 'vitest';
import type {
	MedicationAdministrationRow,
	MedicationLineRow,
	MedicationScheduleRow
} from '$lib/model/type/medora/clinical-platform.type';
import { buildMarGrid } from '$lib/tool/nursing/emar-mar.util';
import { buildMarPrintBody } from '$lib/tool/nursing/emar-mar-print.util';

const lineStub = (
	overrides: Partial<MedicationLineRow> & { lineId: number }
): MedicationLineRow => ({
	lineNo: overrides.lineId,
	itemName: `Drug ${overrides.lineId}`,
	doseText: '1 g',
	routeName: 'Oral',
	instructions: null,
	orderTypeName: 'Routine',
	frequencyAbbreviation: 'BD',
	frequencyPerDay: '2',
	infusionType: null,
	rateMlHr: null,
	...overrides
});

const scheduleStub = (
	lineId: number,
	id: number,
	scheduledAt: string
): MedicationScheduleRow & MedicationLineRow => ({
	...lineStub({ lineId }),
	id,
	visitId: 'visit-1',
	scheduledAt,
	doseLabel: null
});

const adminStub = (
	overrides: Partial<MedicationAdministrationRow> & { id: number; lineId: number }
): MedicationAdministrationRow => ({
	scheduleId: null,
	administrationStatus: 'given',
	administeredAt: '2026-11-16T08:05:00.000Z',
	nurseInitials: 'AB',
	displayReason: null,
	...overrides
});

const patient = { name: 'Daw Hnin Si', code: 'P-001', visitNo: 'V-9' };
const bed = { wardName: 'Ward A', roomName: 'Room 1', bedName: 'B1' };

function gridFor(
	lines: MedicationLineRow[],
	schedules: (MedicationScheduleRow & MedicationLineRow)[],
	administrations: MedicationAdministrationRow[] = [],
	prnLines: MedicationLineRow[] = []
) {
	return buildMarGrid({
		schedules,
		administrations,
		prnLines,
		now: '2026-11-16T21:00:00.000Z',
		formatColumnLabel: (at) => at.slice(11, 16)
	});
}

describe('buildMarPrintBody', () => {
	it('escapes a drug name instead of injecting it as markup', () => {
		const schedule = {
			...scheduleStub(1, 10, '2026-11-16T08:00:00.000Z'),
			itemName: '<script>alert(1)</script>'
		};
		const html = buildMarPrintBody({
			grid: gridFor([lineStub({ lineId: 1 })], [schedule]),
			patient,
			bedLocation: bed
		});
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
	});

	it('renders one row per scheduled line and one column per due time', () => {
		const html = buildMarPrintBody({
			grid: gridFor(
				[lineStub({ lineId: 1 }), lineStub({ lineId: 2 })],
				[
					scheduleStub(1, 10, '2026-11-16T08:00:00.000Z'),
					scheduleStub(1, 11, '2026-11-16T20:00:00.000Z'),
					scheduleStub(2, 12, '2026-11-16T08:00:00.000Z')
				]
			),
			patient,
			bedLocation: bed
		});
		expect(html.match(/<th>08:00<\/th>/g) ?? []).toHaveLength(1);
		expect(html).toContain('<th>20:00</th>');
		expect(html).toContain('Drug 1 · 1 g · Oral');
		expect(html).toContain('Drug 2 · 1 g · Oral');
	});

	it('prints the state and reason of a charted dose', () => {
		const html = buildMarPrintBody({
			grid: gridFor(
				[lineStub({ lineId: 1 })],
				[scheduleStub(1, 10, '2026-11-16T08:00:00.000Z')],
				[
					adminStub({
						id: 1,
						lineId: 1,
						scheduleId: 10,
						administrationStatus: 'held',
						displayReason: 'Patient refused'
					})
				]
			),
			patient,
			bedLocation: bed
		});
		expect(html).toContain('Held (Patient refused)');
	});

	it('prints the patient and bed header', () => {
		const html = buildMarPrintBody({
			grid: gridFor([], []),
			patient,
			bedLocation: bed
		});
		expect(html).toContain('Daw Hnin Si');
		expect(html).toContain('V-9');
		expect(html).toContain('Ward A · Room 1 · B1');
		expect(html).toContain('No scheduled medications.');
	});

	it('says so when no bed is assigned', () => {
		const html = buildMarPrintBody({
			grid: gridFor([], []),
			patient,
			bedLocation: null
		});
		expect(html).toContain('No bed assigned');
	});
});
