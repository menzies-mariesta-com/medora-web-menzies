/**
 * Stock / inventory alert emails: layout matches `reset-password.html` (Menzies Medora teal card).
 */
import stockAlertHtml from './stock-alert.html?raw';
import { applyEmailBrandPlaceholders } from './email-brand';

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export interface StockAlertEmailParams {
	metaTitle: string;
	title: string;
	body: string;
	url: string;
	ctaLabel: string;
	footnote?: string;
	/** Absolute logo URL; defaults from BETTER_AUTH_BASE_URL / BETTER_AUTH_URL. */
	logoUrl?: string;
}

export function renderStockAlertEmail(
	params: StockAlertEmailParams
): { html: string; plainText: string } {
	const footnote =
		params.footnote ??
		'You can change notification preferences in Menzies Medora under Inventory setup → Stock alerts.';

	const html = applyEmailBrandPlaceholders(
		stockAlertHtml
			.replace(/\{\{metaTitle\}\}/g, escapeHtml(params.metaTitle))
			.replace(/\{\{title\}\}/g, escapeHtml(params.title))
			.replace(/\{\{body\}\}/g, escapeHtml(params.body))
			.replace(/\{\{url\}\}/g, escapeHtml(params.url))
			.replace(/\{\{ctaLabel\}\}/g, escapeHtml(params.ctaLabel))
			.replace(/\{\{footnote\}\}/g, escapeHtml(footnote)),
		{ logoUrl: params.logoUrl }
	);

	const plainText = `${params.title}\n\n${params.body}\n\n${params.ctaLabel}: ${params.url}`;
	return { html, plainText };
}
