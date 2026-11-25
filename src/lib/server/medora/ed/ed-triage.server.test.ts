import { describe, expect, it } from 'vitest';
import {
	hasTriageVitals,
	planEdTriageSave,
	resolveEdTriageOutcome,
	triageVitalColumns
} from '$lib/tool/ed/ed-triage.util';
import { ApiErrorCodeEnum } from '$lib/model/enum/api-error.enum';

/**
 * Decision logic for `saveEdTriage` (`ed-triage.server.ts`). Postgres is not
 * reachable from unit tests, so the guard order and derived columns are
 * asserted through the pure helpers the server module calls.
 */
describe('saveEdTriage — draft vs sign', () => {
	it('draft does not resolve an acuity (required fields may be empty)', () => {
		const plan = planEdTriageSave({
			action: 'draft',
			system: 'esi',
			defaultSystem: 'esi',
			alreadySigned: false
		});
		expect(plan).toEqual({ ok: true, sign: false });
	});

	it('complete with a missing required acuity is rejected by the outcome resolver', () => {
		expect(() =>
			resolveEdTriageOutcome({
				system: 'esi',
				values: { chief_complaint: 'x' }
			})
		).toThrow();
	});

	it('complete signs and yields a board column', () => {
		const plan = planEdTriageSave({
			action: 'triage',
			system: 'esi',
			defaultSystem: 'esi',
			alreadySigned: false
		});
		expect(plan).toEqual({ ok: true, sign: true });
		expect(
			resolveEdTriageOutcome({
				system: 'esi',
				values: { esi_level: '2' }
			}).boardColumn
		).toBe('resus');
	});
});

describe('saveEdTriage — amendment guard', () => {
	it('re-triage of a signed encounter is a 409 with a machine-readable code', () => {
		const plan = planEdTriageSave({
			action: 'triage',
			system: 'esi',
			defaultSystem: 'esi',
			alreadySigned: true
		});
		expect(plan.ok).toBe(false);
		if (plan.ok) return;
		expect(plan.status).toBe(409);
		expect(plan.code).toBe(ApiErrorCodeEnum.ED_TRIAGE_ALREADY_SIGNED);
	});

	it('amend of a signed encounter is allowed and keeps signing', () => {
		expect(
			planEdTriageSave({
				action: 'amend',
				system: 'esi',
				defaultSystem: 'esi',
				alreadySigned: true
			})
		).toEqual({ ok: true, sign: true });
	});
});

describe('saveEdTriage — triage system override', () => {
	it('rejects an override without a reason', () => {
		const plan = planEdTriageSave({
			action: 'triage',
			system: 'mts',
			defaultSystem: 'esi',
			overrideReason: '   ',
			alreadySigned: false
		});
		expect(plan.ok).toBe(false);
		if (plan.ok) return;
		expect(plan.status).toBe(400);
	});

	it('accepts an override with a reason', () => {
		expect(
			planEdTriageSave({
				action: 'triage',
				system: 'mts',
				defaultSystem: 'esi',
				overrideReason: 'Consultant asked for MTS',
				alreadySigned: false
			})
		).toEqual({ ok: true, sign: true });
	});

	it('does not require a reason when the system is the hospital default', () => {
		expect(
			planEdTriageSave({
				action: 'triage',
				system: 'esi',
				defaultSystem: 'esi',
				alreadySigned: false
			})
		).toEqual({ ok: true, sign: true });
	});
});

describe('saveEdTriage — vitals block', () => {
	it('skips the vital row when nothing was entered', () => {
		expect(hasTriageVitals(undefined)).toBe(false);
		expect(hasTriageVitals({ pulse: null, spO2: null })).toBe(false);
	});

	it('creates a vital row when at least one value is present', () => {
		expect(hasTriageVitals({ pulse: 92 })).toBe(true);
		expect(
			triageVitalColumns({ pulse: 92, bpSystolic: 118, spO2: 97 })
		).toEqual({
			pulse: '92',
			respiration: null,
			bpSystolic: '118',
			bpDiastolic: null,
			spO2: '97',
			temperature: null
		});
	});
});
