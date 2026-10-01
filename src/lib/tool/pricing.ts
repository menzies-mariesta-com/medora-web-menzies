/** Annual discount vs monthly list price. */
export const ANNUAL_OFF = 0.2;

/** Local display rate for Myanmar (1 USD = 5000 MMK). */
export const USD_TO_MMK = 5000;

/**
 * On-premise monthly premium over the matching Cloud tier (USD).
 * Same product tiers; +$150 covers install/setup on customer infra.
 */
export const ONPREM_PREMIUM_USD = 150;

/** Cloud monthly list prices (USD). Platform is custom quote. */
export const CLOUD_MONTHLY_USD = {
	starter: 99,
	business: 249,
	scale: 499
} as const;

export type BillingPeriod = 'monthly' | 'annual';
export type PricingMarket = 'global' | 'myanmar';
export type ServiceMode = 'cloud' | 'onprem';

export function onpremMonthlyUsd(cloudMonthlyUsd: number): number {
	return cloudMonthlyUsd + ONPREM_PREMIUM_USD;
}

export function monthlyListUsd(
	monthlyUsd: number,
	period: BillingPeriod
): number {
	if (period !== 'annual') return monthlyUsd;
	return Math.round(monthlyUsd * (1 - ANNUAL_OFF));
}

export function effectiveMonthlyUsd(
	cloudMonthlyUsd: number,
	mode: ServiceMode,
	period: BillingPeriod
): number {
	const list =
		mode === 'onprem'
			? onpremMonthlyUsd(cloudMonthlyUsd)
			: cloudMonthlyUsd;
	return monthlyListUsd(list, period);
}

export function usdToMmk(usd: number): number {
	return usd * USD_TO_MMK;
}

export function formatMmk(amount: number): string {
	return new Intl.NumberFormat('en-US').format(amount);
}

export function formatUsd(amount: number): string {
	return new Intl.NumberFormat('en-US').format(amount);
}

export const TRIAL_DURATION_OPTIONS = [
	{ value: '7d', label: '7 days' },
	{ value: '14d', label: '2 weeks' },
	{ value: '30d', label: '1 month' }
] as const;

export type TrialDuration = (typeof TRIAL_DURATION_OPTIONS)[number]['value'];

export function isTrialDuration(value: string): value is TrialDuration {
	return TRIAL_DURATION_OPTIONS.some((o) => o.value === value);
}
