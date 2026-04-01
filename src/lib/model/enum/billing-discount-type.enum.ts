/**
 * Fixed IDs for rows in `billing_discount_type` (seeded in `master-table-seed`).
 * Prefer loading options from the master table / `getBillingDiscountType` for UI.
 */
export enum BillingDiscountTypeEnum {
	NONE = 1,
	PERCENT = 2,
	FIXED_AMOUNT = 3
}

/** Stable `billing_discount_type.code` values (match seed). */
export const BillingDiscountTypeCode = {
	NONE: 'none',
	PERCENT: 'percent',
	AMOUNT: 'amount'
} as const;

export type BillingDiscountTypeCode =
	(typeof BillingDiscountTypeCode)[keyof typeof BillingDiscountTypeCode];
