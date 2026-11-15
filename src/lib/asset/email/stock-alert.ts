/**
 * Stock / inventory alert emails.
 */
import { applyEmailBrandPlaceholders, emailLogoSrcForSend } from './email-brand';
import {
	buildMedoraEmailDocument,
	emailCardFootnote,
	emailHeadingStyle,
	emailLeadStyle,
	emailPrimaryButton
} from './email-layout';
import { escapeHtml } from './email-escape';

export interface StockAlertEmailParams {
	metaTitle: string;
	title: string;
	body: string;
	url: string;
	ctaLabel: string;
	footnote?: string;
	logoUrl?: string;
}

export function renderStockAlertEmail(
	params: StockAlertEmailParams
): { html: string; plainText: string } {
	const footnote =
		params.footnote ??
		'You can change how often you receive these alerts in Medora under Inventory → Stock alerts.';

	const resolvedLogo = params.logoUrl ?? emailLogoSrcForSend();
	const cardBody = `
		<h1 style="${emailHeadingStyle}">${escapeHtml(params.title)}</h1>
		<p style="${emailLeadStyle}">${escapeHtml(params.body)}</p>
		${emailPrimaryButton(params.url, params.ctaLabel)}
		${emailCardFootnote(footnote)}`;

	const html = applyEmailBrandPlaceholders(
		buildMedoraEmailDocument({
			pageTitle: params.metaTitle,
			preheader: params.body.slice(0, 120),
			cardBodyHtml: cardBody,
			logoUrl: resolvedLogo,
			brandName: 'Medora',
			maxWidthPx: 520
		}),
		{ logoUrl: resolvedLogo }
	);

	const plainText = `${params.title}\n\n${params.body}\n\n${params.ctaLabel}: ${params.url}`;
	return { html, plainText };
}