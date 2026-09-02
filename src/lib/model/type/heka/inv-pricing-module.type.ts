/** Sale/charge modules with a pricing formula assignment. */
export const INV_PRICING_MODULE_CODES = ['IS', 'ES', 'DC'] as const;

export type InvPricingModuleCode =
	(typeof INV_PRICING_MODULE_CODES)[number];

export const INTERNAL_SALES_PRICING_MODULE = 'IS' as const;
export const EXTERNAL_SALES_PRICING_MODULE = 'ES' as const;
export const DEPARTMENT_CONSUMPTION_PRICING_MODULE = 'DC' as const;
