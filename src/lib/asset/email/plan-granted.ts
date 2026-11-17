import { applyEmailBrandPlaceholders, emailLogoSrcForSend } from './email-brand';
import {
	buildMedoraEmailDocument,
	emailDetailsTable,
	emailHeadingStyle,
	emailLeadStyle,
	emailPrimaryButton,
	EMAIL_SUPPORT_EMAIL
} from './email-layout';

export { EMAIL_SUPPORT_EMAIL as PLAN_SUPPORT_EMAIL };

export type PlanGrantedEmailFields = {
	fullName: string;
	hospitalName: string;
	pricingTier: string;
	billingModeLabel: string;
	planDetailLabel: string;
	periodEndLabel: string | null;
	/** When set, primary CTA is set password (new owner). */
	resetUrl: string | null;
	loginUrl: string;
};

export function renderPlanGrantedEmail(fields: PlanGrantedEmailFields): {
	html: string;
	plainText: string;
	subject: string;
} {
	const intro = fields.resetUrl
		? 'Great news — your request has been approved. Set your password below, then sign in to your Medora owner workspace with the plan summarized here.'
		: 'Great news — your request has been approved. Sign in with your Medora account to open your workspace with the plan summarized below.';
	const rows: [string, string][] = [
		['Name', fields.fullName],
		['Hospital', fields.hospitalName],
		['Tier', fields.pricingTier],
		['Billing', fields.billingModeLabel],
		['Plan details', fields.planDetailLabel]
	];
	if (fields.periodEndLabel) {
		rows.push(['Trial ends / renews', fields.periodEndLabel]);
	}
	const href = fields.resetUrl ?? fields.loginUrl;
	const ctaLabel = fields.resetUrl ? 'Set your password' : 'Sign in to Medora';
	const resolvedLogo = emailLogoSrcForSend();
	const cardBody = `
		<h1 style="${emailHeadingStyle}">You're approved to use Medora</h1>
		<p style="${emailLeadStyle}">${intro}</p>
		<p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#134e4a;">Your current plan</p>
		${emailDetailsTable(rows)}
		${emailPrimaryButton(href, ctaLabel)}`;
	const html = applyEmailBrandPlaceholders(
		buildMedoraEmailDocument({
			pageTitle: 'Plan approved · Medora',
			preheader: 'Your Medora plan request was approved — sign in when you are ready.',
			cardBodyHtml: cardBody,
			logoUrl: resolvedLogo,
			brandName: 'Medora'
		}),
		{ logoUrl: resolvedLogo }
	);
	const plain = [
		intro,
		'',
		`Name: ${fields.fullName}`,
		`Hospital: ${fields.hospitalName}`,
		'Your current plan:',
		`Tier: ${fields.pricingTier}`,
		`Billing: ${fields.billingModeLabel}`,
		`Plan details: ${fields.planDetailLabel}`,
		fields.periodEndLabel
			? `Trial ends / renew: ${fields.periodEndLabel}`
			: '',
		'',
		fields.resetUrl
			? `Set your password: ${fields.resetUrl}`
			: `Sign in: ${fields.loginUrl}`,
		'',
		`Questions? ${EMAIL_SUPPORT_EMAIL}`
	]
		.filter(Boolean)
		.join('\n');
	return {
		html,
		plainText: plain,
		subject: 'Your Medora plan was approved'
	};
}