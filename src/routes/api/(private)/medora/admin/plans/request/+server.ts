import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OwnerBillingModeEnum } from '$lib/model/enum/plan.enum';
import {
	grantPlanRequest,
	ignorePlanRequest,
	removePlanRequest
} from '$lib/server/medora/plan/plan-admin.server';

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? '');
	const requestId = String(body.requestId ?? '');

	if (!requestId) throw error(400, 'requestId required');

	if (action === 'ignore') {
		await ignorePlanRequest(event, requestId);
		return json({ success: true });
	}
	if (action === 'remove') {
		await removePlanRequest(event, requestId);
		return json({ success: true });
	}
	if (action === 'grant') {
		const billingMode = String(
			body.billingMode ?? OwnerBillingModeEnum.TRIAL
		) as OwnerBillingModeEnum;
		await grantPlanRequest(event, {
			requestId,
			pricingTier: String(body.pricingTier ?? ''),
			billingMode,
			trialDuration:
				body.trialDuration != null
					? String(body.trialDuration)
					: null,
			startedAt: String(body.startedAt ?? ''),
			renewAt:
				body.renewAt != null && body.renewAt !== ''
					? String(body.renewAt)
					: null
		});
		return json({ success: true });
	}

	throw error(400, 'Unknown action');
};
