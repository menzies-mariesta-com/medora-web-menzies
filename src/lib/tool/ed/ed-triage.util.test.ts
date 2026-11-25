import { describe, expect, it } from 'vitest';
import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';
import { edBoardColumnRequiresErBed } from '$lib/model/const/ed-board-column.const';
import {
	EdTriageOutcomeError,
	resolveEdTriageOutcome
} from '$lib/tool/ed/ed-triage.util';

describe('resolveEdTriageOutcome — ESI', () => {
	it.each([
		['1', EdBoardColumnEnum.RESUS, 1, false],
		['2', EdBoardColumnEnum.RESUS, 2, false],
		['3', EdBoardColumnEnum.WAITING_CLINICIAN, 3, false],
		['4', EdBoardColumnEnum.FAST_TRACK, 4, true],
		['5', EdBoardColumnEnum.FAST_TRACK, 5, true]
	])(
		'maps ESI %s to %s',
		(level, boardColumn, triageLevel, fastTrack) => {
			expect(
				resolveEdTriageOutcome({
					system: 'esi',
					values: { esi_level: level }
				})
			).toEqual({
				acuityLevel: level,
				boardColumn,
				triageLevel,
				fastTrack
			});
		}
	);
});

describe('resolveEdTriageOutcome — MTS', () => {
	it.each([
		['red', EdBoardColumnEnum.RESUS, 1, false],
		['orange', EdBoardColumnEnum.RESUS, 2, false],
		['yellow', EdBoardColumnEnum.WAITING_CLINICIAN, 3, false],
		['green', EdBoardColumnEnum.FAST_TRACK, 4, true],
		['blue', EdBoardColumnEnum.FAST_TRACK, 5, true]
	])(
		'maps MTS %s to %s',
		(category, boardColumn, triageLevel, fastTrack) => {
			expect(
				resolveEdTriageOutcome({
					system: 'mts',
					values: { mts_category: category }
				})
			).toEqual({
				acuityLevel: category,
				boardColumn,
				triageLevel,
				fastTrack
			});
		}
	);
});

describe('resolveEdTriageOutcome — submitted system wins', () => {
	it('ignores a stale esi_level when MTS was submitted', () => {
		const outcome = resolveEdTriageOutcome({
			system: 'mts',
			values: { esi_level: '1', mts_category: 'green' }
		});
		expect(outcome.acuityLevel).toBe('green');
		expect(outcome.boardColumn).toBe(EdBoardColumnEnum.FAST_TRACK);
	});

	it('ignores a stale mts_category when ESI was submitted', () => {
		const outcome = resolveEdTriageOutcome({
			system: 'esi',
			values: { mts_category: 'red', esi_level: '4' }
		});
		expect(outcome.acuityLevel).toBe('4');
		expect(outcome.boardColumn).toBe(EdBoardColumnEnum.FAST_TRACK);
	});
});

describe('resolveEdTriageOutcome — rejection', () => {
	it('rejects an unknown system', () => {
		expect(() =>
			resolveEdTriageOutcome({ system: 'news2', values: {} })
		).toThrow(EdTriageOutcomeError);
	});

	it('rejects a missing ESI level', () => {
		expect(() =>
			resolveEdTriageOutcome({ system: 'esi', values: {} })
		).toThrow(EdTriageOutcomeError);
	});

	it('rejects an out-of-range ESI level', () => {
		expect(() =>
			resolveEdTriageOutcome({
				system: 'esi',
				values: { esi_level: '7' }
			})
		).toThrow(EdTriageOutcomeError);
	});

	it('rejects an unknown MTS category', () => {
		expect(() =>
			resolveEdTriageOutcome({
				system: 'mts',
				values: { mts_category: 'purple' }
			})
		).toThrow(EdTriageOutcomeError);
	});
});

describe('ER bed gate', () => {
	it('is required only for resus (majors / awaiting admit keep it too)', () => {
		expect(edBoardColumnRequiresErBed(EdBoardColumnEnum.RESUS)).toBe(
			true
		);
		expect(edBoardColumnRequiresErBed(EdBoardColumnEnum.MAJORS)).toBe(
			true
		);
		expect(
			edBoardColumnRequiresErBed(EdBoardColumnEnum.AWAITING_ADMIT)
		).toBe(true);
	});

	it('is not required for bed-free triage outcomes', () => {
		expect(
			edBoardColumnRequiresErBed(EdBoardColumnEnum.WAITING_CLINICIAN)
		).toBe(false);
		expect(
			edBoardColumnRequiresErBed(EdBoardColumnEnum.FAST_TRACK)
		).toBe(false);
		expect(
			edBoardColumnRequiresErBed(EdBoardColumnEnum.WAITING_TRIAGE)
		).toBe(false);
	});

	it('matches the mapping table: only ESI 1-2 / MTS red-orange need a bed', () => {
		const resus = ['1', '2'].map((level) =>
			resolveEdTriageOutcome({
				system: 'esi',
				values: { esi_level: level }
			})
		);
		const bedFree = ['3', '4', '5'].map((level) =>
			resolveEdTriageOutcome({
				system: 'esi',
				values: { esi_level: level }
			})
		);
		expect(
			resus.every((o) => edBoardColumnRequiresErBed(o.boardColumn))
		).toBe(true);
		expect(
			bedFree.every((o) => !edBoardColumnRequiresErBed(o.boardColumn))
		).toBe(true);
	});
});
