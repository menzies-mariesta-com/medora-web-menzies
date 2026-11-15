import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isPricingTier, type PricingTier } from '$lib/model/enum/plan.enum';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';

const PAID_TIERS = new Set(['starter', 'business', 'scale']);

export const load: PageServerLoad = async ({ params, url }) => {
	const tier = params.tier ?? '';
	if (!isPricingTier(tier) || !PAID_TIERS.has(tier)) {
		throw error(404, 'Plan not found');
	}
	const origin = getSiteOrigin() || url.origin;
	return { tier: tier as PricingTier, origin };
};
