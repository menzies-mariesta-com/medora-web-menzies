import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendEmailServer } from '$lib/server/util/mailer.server';
import { issueTrialOtp } from '$lib/server/pricing/trial-otp.server';
import { renderOtpVerificationEmail } from '$lib/asset/email/otp-verification';
import {
	emailExistsForPlanRequest,
	PLAN_REQUEST_EXISTING_USER_CODE,
	PLAN_REQUEST_EXISTING_USER_MESSAGE
} from '$lib/server/pricing/plan-request-eligibility.server';

export const POST: RequestHandler = async ({ request }) => {
	let body: { email?: string };
	try {
		body = (await request.json()) as { email?: string };
	} catch {
		return json({ success: false, message: 'Invalid request.' }, { status: 400 });
	}

	const email = String(body.email ?? '')
		.trim()
		.toLowerCase();
	if (!email.includes('@')) {
		return json(
			{ success: false, message: 'Enter a valid email address.' },
			{ status: 400 }
		);
	}
	if (await emailExistsForPlanRequest(email)) {
		return json(
			{
				success: false,
				message: PLAN_REQUEST_EXISTING_USER_MESSAGE,
				code: PLAN_REQUEST_EXISTING_USER_CODE
			},
			{ status: 409 }
		);
	}

	const code = await issueTrialOtp(email);
	const rendered = renderOtpVerificationEmail({
		otp: code,
		type: 'email-verification'
	});
	const sent = await sendEmailServer({
		to: email,
		subject: rendered.subject,
		message: rendered.plainText,
		html: rendered.html
	});

	if (!sent) {
		return json(
			{
				success: false,
				message: 'Could not send verification code. Try again later.'
			},
			{ status: 500 }
		);
	}

	return json({
		success: true,
		message: 'Verification code sent. Check your inbox.'
	});
};
