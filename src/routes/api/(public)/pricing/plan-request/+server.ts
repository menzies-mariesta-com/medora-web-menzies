import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PlanRequestKindEnum } from '$lib/model/enum/plan.enum';
import { submitPlanRequest } from '$lib/server/pricing/submit-plan-request.server';

export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData();
	const firstName = String(form.get('firstName') ?? '').trim();
	const lastName = String(form.get('lastName') ?? '').trim();
	const hospitalName = String(form.get('hospitalName') ?? '').trim();
	const website = String(form.get('website') ?? '').trim();
	const email = String(form.get('email') ?? '')
		.trim()
		.toLowerCase();
	const message = String(form.get('message') ?? '').trim();
	const tier = String(form.get('tier') ?? '').trim();
	const otp = String(form.get('otp') ?? '').trim();

	const result = await submitPlanRequest({
		firstName,
		lastName,
		hospitalName,
		website,
		email,
		message,
		otp,
		requestKind: PlanRequestKindEnum.PAID,
		pricingTier: tier,
		trialDuration: null
	});

	if (!result.ok) {
		return json(
			{
				success: false,
				message: result.message,
				...(result.code ? { code: result.code } : {})
			},
			{ status: result.status }
		);
	}

	return json({
		success: true,
		message: 'Plan request received. We will follow up by email soon.'
	});
};
