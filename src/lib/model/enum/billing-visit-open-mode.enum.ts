/** Hospital billing setting: when new patient visits may be opened. */
export enum BillingVisitOpenModeEnum {
	ONE_VISIT_ONE_BILL = 1,
	MULTIPLE_VISIT_ONE_BILL = 2
}

export function parseBillingVisitOpenMode(
	value: number | string | null | undefined
): BillingVisitOpenModeEnum {
	const n = typeof value === 'string' ? Number(value) : value;
	if (n === BillingVisitOpenModeEnum.MULTIPLE_VISIT_ONE_BILL) {
		return BillingVisitOpenModeEnum.MULTIPLE_VISIT_ONE_BILL;
	}
	return BillingVisitOpenModeEnum.ONE_VISIT_ONE_BILL;
}
