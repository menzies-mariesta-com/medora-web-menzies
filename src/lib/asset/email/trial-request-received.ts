import { applyEmailBrandPlaceholders, emailLogoSrcForSend } from './email-brand';
import {
	buildMedoraEmailDocument,
	emailDetailsTable,
	emailHeadingStyle,
	emailLeadStyle
} from './email-layout';

export type PlanRequestEmailFields = {
	fullName: string;
	hospitalName: string;
	website: string;
	email: string;
	durationOrTier: string;
	message: string;
	requestKindLabel: string;
};

export function planRequestDetailsHtml(fields: PlanRequestEmailFields): string {
	const rows: [string, string][] = [
		['Name', fields.fullName],
		['Hospital', fields.hospitalName],
		['Email', fields.email],
		['Website', fields.website || '—'],
		['Request', fields.requestKindLabel],
		['Plan / duration', fields.durationOrTier],
		['Message', fields.message || '—']
	];
	return emailDetailsTable(rows);
}

function detailsPlain(fields: PlanRequestEmailFields): string {
	return [
		`Name: ${fields.fullName}`,
		`Hospital: ${fields.hospitalName}`,
		`Email: ${fields.email}`,
		`Website: ${fields.website || '(none)'}`,
		`Request: ${fields.requestKindLabel}`,
		`Plan / duration: ${fields.durationOrTier}`,
		'',
		'Message:',
		fields.message || '(none)'
	].join('\n');
}

export function renderTrialRequestReceivedEmail(
	fields: PlanRequestEmailFields
): { html: string; plainText: string; subject: string } {
	const intro =
		'Thank you for reaching out to Medora. Our team has your details and will follow up by email with the next steps, usually within one business day.';
	const resolvedLogo = emailLogoSrcForSend();
	const cardBody = `
		<h1 style="${emailHeadingStyle}">We received your request</h1>
		<p style="${emailLeadStyle}">${intro}</p>
		${planRequestDetailsHtml(fields)}`;
	const html = applyEmailBrandPlaceholders(
		buildMedoraEmailDocument({
			pageTitle: 'Request received · Medora',
			preheader: 'We received your Medora plan request and will be in touch soon.',
			cardBodyHtml: cardBody,
			logoUrl: resolvedLogo,
			brandName: 'Medora'
		}),
		{ logoUrl: resolvedLogo }
	);
	const plainText = `${intro}\n\n${detailsPlain(fields)}`;
	return {
		html,
		plainText,
		subject: 'We received your Medora request'
	};
}