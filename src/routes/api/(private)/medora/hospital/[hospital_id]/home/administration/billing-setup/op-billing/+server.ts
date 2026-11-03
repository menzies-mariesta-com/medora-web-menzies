import { BillingSetupCareSettingEnum } from '$lib/model/enum/billing-setup-care-setting.enum';
import { createBillingSetupCareSettingHandlers } from '$lib/server/medora/administration/billing-setup/billing-setup-api-handlers.server';

const handlers = createBillingSetupCareSettingHandlers(
	BillingSetupCareSettingEnum.OP
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
