import {
	OwnerBillingModeEnum,
	OwnerEntitlementPhaseEnum,
	OwnerEntitlementStatusEnum,
	PLAN_GRACE_DAYS
} from '$lib/model/enum/plan.enum';
import type {
	OwnerEntitlementPhaseResult,
	OwnerEntitlementSnapshot
} from '$lib/model/type/plan/owner-entitlement.type';
import { parseUtcInstant } from '$lib/util/utc-instant.util';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addUtcDays(
	utcIso: string,
	days: number
): number {
	const t = parseUtcInstant(utcIso);
	if (!Number.isFinite(t)) return NaN;
	return t + days * MS_PER_DAY;
}

export function trialEndsAtFromStart(
	startedAt: string,
	trialDuration: string
): string {
	const startMs = parseUtcInstant(startedAt);
	if (!Number.isFinite(startMs)) return startedAt;
	const days =
		trialDuration === '7d'
			? 7
			: trialDuration === '14d'
				? 14
				: trialDuration === '30d'
					? 30
					: 0;
	return new Date(startMs + days * MS_PER_DAY).toISOString();
}

export function computeOwnerEntitlementPhase(
	row: OwnerEntitlementSnapshot | null | undefined,
	nowMs: number = Date.now()
): OwnerEntitlementPhaseResult {
	const none: OwnerEntitlementPhaseResult = {
		phase: OwnerEntitlementPhaseEnum.NO_PLAN,
		ribbonLabel: null,
		showRibbon: false,
		endBoundaryMs: null,
		graceEndsMs: null
	};
	if (!row || row.status === OwnerEntitlementStatusEnum.REMOVED) {
		return none;
	}
	if (
		row.status === OwnerEntitlementStatusEnum.SUSPENDED ||
		row.status === OwnerEntitlementStatusEnum.REVOKED
	) {
		const label =
			row.billingMode === OwnerBillingModeEnum.TRIAL
				? 'Trial expired'
				: 'Plan expired';
		return {
			phase: OwnerEntitlementPhaseEnum.READ_ONLY,
			ribbonLabel: label,
			showRibbon: true,
			endBoundaryMs: null,
			graceEndsMs: null
		};
	}

	const endBoundaryMs =
		row.endsAt != null && row.endsAt !== ''
			? parseUtcInstant(row.endsAt)
			: row.renewAt != null && row.renewAt !== ''
				? parseUtcInstant(row.renewAt)
				: NaN;

	const ribbonTrial = 'Trial expired';
	const ribbonPlan = 'Plan expired';
	const ribbonLabel =
		row.billingMode === OwnerBillingModeEnum.TRIAL
			? ribbonTrial
			: ribbonPlan;

	if (!Number.isFinite(endBoundaryMs)) {
		return {
			phase: OwnerEntitlementPhaseEnum.ACTIVE,
			ribbonLabel: null,
			showRibbon: false,
			endBoundaryMs: null,
			graceEndsMs: null
		};
	}

	const graceEndsMs =
		endBoundaryMs + PLAN_GRACE_DAYS * MS_PER_DAY;

	if (nowMs < endBoundaryMs) {
		return {
			phase: OwnerEntitlementPhaseEnum.ACTIVE,
			ribbonLabel: null,
			showRibbon: false,
			endBoundaryMs,
			graceEndsMs
		};
	}
	if (nowMs < graceEndsMs) {
		return {
			phase: OwnerEntitlementPhaseEnum.GRACE,
			ribbonLabel,
			showRibbon: true,
			endBoundaryMs,
			graceEndsMs
		};
	}
	return {
		phase: OwnerEntitlementPhaseEnum.READ_ONLY,
		ribbonLabel,
		showRibbon: true,
		endBoundaryMs,
		graceEndsMs
	};
}

export function isOwnerWorkspaceMutationsBlocked(
	phase: OwnerEntitlementPhaseEnum
): boolean {
	return phase === OwnerEntitlementPhaseEnum.READ_ONLY;
}
