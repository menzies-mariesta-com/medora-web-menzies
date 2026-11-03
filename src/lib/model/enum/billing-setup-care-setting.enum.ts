/** OP / IP / ER (ED UI maps to ER) billing setup scope. */
export enum BillingSetupCareSettingEnum {
	OP = 'OP',
	IP = 'IP',
	ER = 'ER'
}

export function parseBillingSetupCareSetting(
	value: string | null | undefined
): BillingSetupCareSettingEnum | null {
	const v = (value ?? '').trim().toUpperCase();
	if (v === BillingSetupCareSettingEnum.OP) {
		return BillingSetupCareSettingEnum.OP;
	}
	if (v === BillingSetupCareSettingEnum.IP) {
		return BillingSetupCareSettingEnum.IP;
	}
	if (v === BillingSetupCareSettingEnum.ER) {
		return BillingSetupCareSettingEnum.ER;
	}
	return null;
}
