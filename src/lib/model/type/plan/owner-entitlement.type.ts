import type {
	OwnerBillingModeEnum,
	OwnerEntitlementPhaseEnum,
	OwnerEntitlementStatusEnum,
	PlanRequestKindEnum,
	PlanRequestStatusEnum,
	PricingTier
} from '$lib/model/enum/plan.enum';

export type OwnerEntitlementSnapshot = {
	status: OwnerEntitlementStatusEnum;
	startedAt: string;
	renewAt: string | null;
	endsAt: string | null;
	billingMode: OwnerBillingModeEnum;
};

export type OwnerEntitlementPhaseResult = {
	phase: OwnerEntitlementPhaseEnum;
	ribbonLabel: string | null;
	showRibbon: boolean;
	endBoundaryMs: number | null;
	graceEndsMs: number | null;
};

export type PlanRequestListRow = {
	id: string;
	requestKind: PlanRequestKindEnum;
	pricingTier: PricingTier | null;
	trialDuration: string | null;
	firstName: string;
	lastName: string;
	hospitalName: string;
	website: string | null;
	email: string;
	message: string | null;
	status: PlanRequestStatusEnum;
	createdAt: string;
};

export type OwnerPlanListRow = {
	entitlementId: string;
	ownerId: string;
	ownerName: string | null;
	ownerEmail: string | null;
	hospitalNames: string[];
	pricingTier: PricingTier;
	billingMode: OwnerBillingModeEnum;
	trialDuration: string | null;
	startedAt: string;
	renewAt: string | null;
	endsAt: string | null;
	status: OwnerEntitlementStatusEnum;
	phase: OwnerEntitlementPhaseEnum;
};
