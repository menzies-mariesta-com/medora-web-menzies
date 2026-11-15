import {
	applyEmailBrandPlaceholders,
	resolveEmailAppOrigin,
	emailLogoSrcForSend
} from './email-brand';
import {
	buildMedoraEmailDocument,
	emailHeadingStyle,
	emailLeadStyle,
	emailPrimaryButton
} from './email-layout';
import { escapeHtml } from './email-escape';
import {
	planRequestDetailsHtml,
	renderTrialRequestReceivedEmail,
	type PlanRequestEmailFields
} from './trial-request-received';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

export function renderTrialRequestAdminEmail(
	fields: PlanRequestEmailFields
): { html: string; plainText: string; subject: string } {
	const customer = renderTrialRequestReceivedEmail(fields);
	const adminPlansUrl = `${resolveEmailAppOrigin()}${WebRoutesEnum.MEDORA_ADMIN_PLANS}?tab=pending`;
	const resolvedLogo = emailLogoSrcForSend();
	const cardBody = `
		<h1 style="${emailHeadingStyle}">New ${escapeHtml(fields.requestKindLabel)} request</h1>
		<p style="${emailLeadStyle}">A hospital team submitted a plan request. Review the details below and approve or decline from the admin Plans page.</p>
		${planRequestDetailsHtml(fields)}
		${emailPrimaryButton(adminPlansUrl, 'Review pending requests')}`;
	const html = applyEmailBrandPlaceholders(
		buildMedoraEmailDocument({
			pageTitle: 'New plan request · Medora',
			preheader: `New ${fields.requestKindLabel} request from ${fields.hospitalName}.`,
			cardBodyHtml: cardBody,
			logoUrl: resolvedLogo,
			brandName: 'Medora',
			maxWidthPx: 520
		}),
		{ logoUrl: resolvedLogo }
	);
	const plainText = [
		`New ${fields.requestKindLabel} request`,
		'',
		customer.plainText,
		'',
		`Admin: ${adminPlansUrl}`
	].join('\n');
	return {
		html,
		plainText,
		subject: `Medora ${fields.requestKindLabel} request: ${fields.hospitalName}`
	};
}