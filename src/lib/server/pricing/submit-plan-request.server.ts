import { env } from '$env/dynamic/private';
import { ensureDb } from '$lib/server/db';
import { planRequestTable } from '$lib/server/db/table/plan-table/plan-table';
import { sendEmailServer } from '$lib/server/util/mailer.server';
import {
	PlanRequestKindEnum,
	PlanRequestStatusEnum
} from '$lib/model/enum/plan.enum';
import { isTrialDuration } from '$lib/tool/pricing';
import { isPricingTier } from '$lib/model/enum/plan.enum';
import {
	hasTrialOtp,
	verifyTrialOtp
} from '$lib/server/pricing/trial-otp.server';
import { uuidV7 } from '$lib/util/id.util';
import {
	renderTrialRequestReceivedEmail,
	type PlanRequestEmailFields
} from '$lib/asset/email/trial-request-received';
import { renderTrialRequestAdminEmail } from '$lib/asset/email/trial-request-admin';
import {
	emailExistsForPlanRequest,
	PLAN_REQUEST_EXISTING_USER_CODE,
	PLAN_REQUEST_EXISTING_USER_MESSAGE
} from '$lib/server/pricing/plan-request-eligibility.server';

export type SubmitPlanRequestInput = {
	firstName: string;
	lastName: string;
	hospitalName: string;
	website: string;
	email: string;
	message: string;
	otp: string;
	requestKind: PlanRequestKindEnum;
	pricingTier: string | null;
	trialDuration: string | null;
};

export type SubmitPlanRequestResult =
	| { ok: true; message: string }
	| {
			ok: false;
			message: string;
			status: number;
			code?: typeof PLAN_REQUEST_EXISTING_USER_CODE;
	  };

function adminInbox(): string {
	return (env.SUPPORT_IT_EMAIL || env.SMTP_USER || '').trim();
}

function durationLabel(duration: string | null): string {
	if (!duration) return '—';
	if (duration === '7d') return '7 days';
	if (duration === '14d') return '2 weeks';
	if (duration === '30d') return '1 month';
	return duration;
}

export async function submitPlanRequest(
	input: SubmitPlanRequestInput
): Promise<SubmitPlanRequestResult> {
	const {
		firstName,
		lastName,
		hospitalName,
		website,
		email,
		message,
		otp,
		requestKind,
		pricingTier,
		trialDuration
	} = input;

	if (!firstName || !lastName || !hospitalName || !email) {
		return { ok: false, message: 'Fill all required fields.', status: 400 };
	}
	if (!email.includes('@')) {
		return {
			ok: false,
			message: 'Enter a valid email address.',
			status: 400
		};
	}
	if (await emailExistsForPlanRequest(email)) {
		return {
			ok: false,
			message: PLAN_REQUEST_EXISTING_USER_MESSAGE,
			status: 409,
			code: PLAN_REQUEST_EXISTING_USER_CODE
		};
	}
	if (requestKind === PlanRequestKindEnum.TRIAL) {
		if (!trialDuration || !isTrialDuration(trialDuration)) {
			return {
				ok: false,
				message: 'Choose a trial duration: 7 days, 2 weeks, or 1 month.',
				status: 400
			};
		}
	} else if (requestKind === PlanRequestKindEnum.PAID) {
		if (!pricingTier || !isPricingTier(pricingTier)) {
			return { ok: false, message: 'Invalid plan tier.', status: 400 };
		}
	}

	if (await hasTrialOtp(email)) {
		if (!otp) {
			return {
				ok: false,
				message: 'Enter the verification code from your email.',
				status: 400
			};
		}
		if (!(await verifyTrialOtp(email, otp))) {
			return {
				ok: false,
				message: 'Invalid or expired verification code.',
				status: 400
			};
		}
	}

	const id = uuidV7();
	await ensureDb().insert(planRequestTable).values({
		id,
		requestKind,
		pricingTier: pricingTier ?? null,
		trialDuration: trialDuration ?? null,
		firstName,
		lastName,
		hospitalName,
		website: website || null,
		email,
		message: message || null,
		status: PlanRequestStatusEnum.PENDING
	});

	const fields: PlanRequestEmailFields = {
		fullName: `${firstName} ${lastName}`,
		hospitalName,
		website,
		email,
		durationOrTier:
			requestKind === PlanRequestKindEnum.TRIAL
				? durationLabel(trialDuration)
				: (pricingTier ?? '—'),
		message,
		requestKindLabel:
			requestKind === PlanRequestKindEnum.TRIAL ? 'trial' : 'plan'
	};

	const customerMail = renderTrialRequestReceivedEmail(fields);
	const customerSent = await sendEmailServer({
		to: email,
		subject: customerMail.subject,
		message: customerMail.plainText,
		html: customerMail.html
	});

	const inbox = adminInbox();
	if (inbox) {
		const adminMail = renderTrialRequestAdminEmail(fields);
		await sendEmailServer({
			to: inbox,
			subject: adminMail.subject,
			message: adminMail.plainText,
			html: adminMail.html
		});
	}

	if (!customerSent) {
		return {
			ok: false,
			message: 'Could not send your request. Try again later.',
			status: 500
		};
	}

	return {
		ok: true,
		message: 'Trial request received. We will follow up by email soon.'
	};
}
