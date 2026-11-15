import { describe, expect, it } from 'vitest';
import {
	OwnerBillingModeEnum,
	OwnerEntitlementPhaseEnum,
	OwnerEntitlementStatusEnum
} from '$lib/model/enum/plan.enum';
import { computeOwnerEntitlementPhase } from '$lib/util/owner-entitlement-phase.util';

const base = {
	status: OwnerEntitlementStatusEnum.ACTIVE,
	startedAt: '2026-01-01T00:00:00.000Z',
	renewAt: null as string | null,
	endsAt: '2026-01-08T00:00:00.000Z',
	billingMode: OwnerBillingModeEnum.TRIAL
};

describe('computeOwnerEntitlementPhase', () => {
	it('returns active before end', () => {
		const r = computeOwnerEntitlementPhase(
			base,
			Date.parse('2026-01-07T12:00:00.000Z')
		);
		expect(r.phase).toBe(OwnerEntitlementPhaseEnum.ACTIVE);
		expect(r.showRibbon).toBe(false);
	});

	it('returns grace after end until grace window', () => {
		const r = computeOwnerEntitlementPhase(
			base,
			Date.parse('2026-01-09T00:00:00.000Z')
		);
		expect(r.phase).toBe(OwnerEntitlementPhaseEnum.GRACE);
		expect(r.showRibbon).toBe(true);
	});

	it('returns read_only after grace', () => {
		const r = computeOwnerEntitlementPhase(
			base,
			Date.parse('2026-01-12T00:00:00.000Z')
		);
		expect(r.phase).toBe(OwnerEntitlementPhaseEnum.READ_ONLY);
	});

	it('suspended is read_only immediately', () => {
		const r = computeOwnerEntitlementPhase(
			{ ...base, status: OwnerEntitlementStatusEnum.SUSPENDED },
			Date.parse('2026-01-01T00:00:00.000Z')
		);
		expect(r.phase).toBe(OwnerEntitlementPhaseEnum.READ_ONLY);
	});
});
