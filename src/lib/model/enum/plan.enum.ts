export enum PlanRequestKindEnum {
	TRIAL = 'trial',
	PAID = 'paid'
}

export enum PlanRequestStatusEnum {
	PENDING = 'pending',
	GRANTED = 'granted',
	IGNORED = 'ignored',
	REMOVED = 'removed'
}

export enum PricingTierEnum {
	STARTER = 'starter',
	BUSINESS = 'business',
	SCALE = 'scale',
	PLATFORM = 'platform'
}

export const PRICING_TIER_VALUES = [
	PricingTierEnum.STARTER,
	PricingTierEnum.BUSINESS,
	PricingTierEnum.SCALE,
	PricingTierEnum.PLATFORM
] as const;

export type PricingTier = (typeof PRICING_TIER_VALUES)[number];

export function isPricingTier(value: string): value is PricingTier {
	return (PRICING_TIER_VALUES as readonly string[]).includes(value);
}

export enum OwnerBillingModeEnum {
	TRIAL = 'trial',
	MONTHLY = 'monthly',
	ANNUAL = 'annual'
}

export enum OwnerEntitlementStatusEnum {
	ACTIVE = 'active',
	SUSPENDED = 'suspended',
	REVOKED = 'revoked',
	REMOVED = 'removed'
}

export enum OwnerEntitlementPhaseEnum {
	NO_PLAN = 'no_plan',
	ACTIVE = 'active',
	GRACE = 'grace',
	READ_ONLY = 'read_only'
}

export const PLAN_GRACE_DAYS = 3;
