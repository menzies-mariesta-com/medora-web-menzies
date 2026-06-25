/** Sale/charge modules with a pricing formula assignment. */
export const INV_PRICING_MODULE_CODES = ['MO', 'DC', 'BILLING'] as const;

export type InvPricingModuleCode =
	(typeof INV_PRICING_MODULE_CODES)[number];
