import type { InferSelectModel } from 'drizzle-orm';
import { planRequestTable } from '$lib/server/db/table/plan-table/plan-table';
import { sendEmailServer } from '$lib/server/util/mailer.server';
import {
	renderPlanDeclinedEmail,
	type PlanDeclinedReason
} from '$lib/asset/email/plan-declined';
import {
	renderPlanGrantedEmail,
	type PlanGrantedEmailFields
} from '$lib/asset/email/plan-granted';
import {
	OwnerBillingModeEnum,
	PlanRequestKindEnum,
	PricingTierEnum
} from '$lib/model/enum/plan.enum';
import { formatMenziesTableDateTime } from '$lib/util/menzies-table-datetime.util';

type PlanRequestRow = InferSelectModel<typeof planRequestTable>;

function durationLabel(duration: string | null): string {
	if (!duration) return '—';
	if (duration === '7d') return '7 days';
	if (duration === '14d') return '2 weeks';
	if (duration === '30d') return '1 month';
	return duration;
}

function billingModeLabel(mode: OwnerBillingModeEnum): string {
	if (mode === OwnerBillingModeEnum.TRIAL) return 'Trial';
	if (mode === OwnerBillingModeEnum.MONTHLY) return 'Monthly';
	if (mode === OwnerBillingModeEnum.ANNUAL) return 'Annual';
	return mode;
}

function pricingTierDisplayLabel(tier: string): string {
	switch (tier) {
		case PricingTierEnum.STARTER:
			return 'Starter';
		case PricingTierEnum.BUSINESS:
			return 'Business';
		case PricingTierEnum.SCALE:
			return 'Scale';
		case PricingTierEnum.PLATFORM:
			return 'Platform';
		default:
			return tier;
	}
}

export function planDetailLabelForRequest(row: PlanRequestRow): string {
	if (row.requestKind === PlanRequestKindEnum.PAID) {
		return row.pricingTier ?? '—';
	}
	return durationLabel(row.trialDuration);
}

function requestKindLabel(row: PlanRequestRow): string {
	return row.requestKind === PlanRequestKindEnum.TRIAL ? 'trial' : 'plan';
}

export async function sendPlanGrantedEmail(
	to: string,
	fields: PlanGrantedEmailFields
): Promise<boolean> {
	const mail = renderPlanGrantedEmail(fields);
	return sendEmailServer({
		to,
		subject: mail.subject,
		message: mail.plainText,
		html: mail.html
	});
}

export async function sendPlanDeclinedEmailForRequest(
	row: PlanRequestRow,
	reason: PlanDeclinedReason
): Promise<boolean> {
	const mail = renderPlanDeclinedEmail({
		fullName: `${row.firstName} ${row.lastName}`.trim(),
		hospitalName: row.hospitalName,
		requestKindLabel: requestKindLabel(row),
		planDetailLabel: planDetailLabelForRequest(row),
		reason
	});
	return sendEmailServer({
		to: row.email,
		subject: mail.subject,
		message: mail.plainText,
		html: mail.html
	});
}

export function grantedEmailFieldsFromGrant(
	row: PlanRequestRow,
	payload: {
		pricingTier: string;
		billingMode: OwnerBillingModeEnum;
		trialDuration: string | null;
		endsAt: string | null;
		renewAt: string | null;
	},
	opts: { resetUrl: string | null; loginUrl: string }
): PlanGrantedEmailFields {
	const planDetail =
		payload.billingMode === OwnerBillingModeEnum.TRIAL
			? durationLabel(payload.trialDuration ?? row.trialDuration)
			: payload.pricingTier;
	let periodEndLabel: string | null = null;
	if (payload.billingMode === OwnerBillingModeEnum.TRIAL && payload.endsAt) {
		periodEndLabel = formatMenziesTableDateTime(payload.endsAt);
	} else if (payload.renewAt) {
		periodEndLabel = formatMenziesTableDateTime(payload.renewAt);
	}
	return {
		fullName: `${row.firstName} ${row.lastName}`.trim(),
		hospitalName: row.hospitalName,
		pricingTier: pricingTierDisplayLabel(payload.pricingTier),
		billingModeLabel: billingModeLabel(payload.billingMode),
		planDetailLabel: planDetail,
		periodEndLabel,
		resetUrl: opts.resetUrl,
		loginUrl: opts.loginUrl
	};
}
