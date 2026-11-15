import { applyEmailBrandPlaceholders, emailLogoSrcForSend } from './email-brand';
import {
	buildMedoraEmailDocument,
	emailDetailsTable,
	emailHeadingStyle,
	emailLeadStyle,
	EMAIL_SUPPORT_EMAIL
} from './email-layout';
import { escapeHtml } from './email-escape';

export type PlanDeclinedReason = 'ignored' | 'removed';

export type PlanDeclinedEmailFields = {
	fullName: string;
	hospitalName: string;
	requestKindLabel: string;
	planDetailLabel: string;
	reason: PlanDeclinedReason;
};

export function renderPlanDeclinedEmail(fields: PlanDeclinedEmailFields): {
	html: string;
	plainText: string;
	subject: string;
} {
	const headline =
		fields.reason === 'removed'
			? 'Your plan request was closed'
			: 'Update on your plan request';
	const intro =
		fields.reason === 'removed'
			? 'We have closed this request for now. If Medora is still a fit for your hospital, our team is happy to talk through options with you.'
			: 'Thank you for your interest in Medora. After review we are not moving forward with this request right now. If your needs change, you are welcome to reach out — we would be glad to help.';
	const rows: [string, string][] = [
		['Name', fields.fullName],
		['Hospital', fields.hospitalName],
		['Request', fields.requestKindLabel],
		['Plan / duration', fields.planDetailLabel]
	];
	const resolvedLogo = emailLogoSrcForSend();
	const cardBody = `
		<h1 style="${emailHeadingStyle}">${escapeHtml(headline)}</h1>
		<p style="${emailLeadStyle}">${escapeHtml(intro)}</p>
		${emailDetailsTable(rows)}
		<p style="margin:20px 0 0;font-size:14px;color:#475569;line-height:1.55;">
			Questions? Email us at
			<a href="mailto:${escapeHtml(EMAIL_SUPPORT_EMAIL)}" style="color:#0d9488;text-decoration:none;">${escapeHtml(EMAIL_SUPPORT_EMAIL)}</a>.
		</p>`;
	const html = applyEmailBrandPlaceholders(
		buildMedoraEmailDocument({
			pageTitle: 'Plan request update · Medora',
			preheader: headline,
			cardBodyHtml: cardBody,
			logoUrl: resolvedLogo,
			brandName: 'Medora'
		}),
		{ logoUrl: resolvedLogo }
	);
	const plainText = [
		headline,
		'',
		intro,
		'',
		`Name: ${fields.fullName}`,
		`Hospital: ${fields.hospitalName}`,
		`Request: ${fields.requestKindLabel}`,
		`Plan / duration: ${fields.planDetailLabel}`,
		'',
		`Contact: ${EMAIL_SUPPORT_EMAIL}`
	].join('\n');
	return {
		html,
		plainText,
		subject: 'Update on your Medora plan request'
	};
}