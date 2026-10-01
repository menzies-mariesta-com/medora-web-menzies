/**
 * Renders the reset-password email template.
 * Used by auth server when sending password reset emails.
 */
import resetPasswordHtml from './reset-password.html?raw';
import { applyEmailBrandPlaceholders } from './email-brand';

export interface ResetPasswordEmailParams {
	url: string;
	/** Absolute logo URL; defaults from BETTER_AUTH_BASE_URL / BETTER_AUTH_URL. */
	logoUrl?: string;
}

export function renderResetPasswordEmail(
	params: ResetPasswordEmailParams
): {
	html: string;
	plainText: string;
} {
	const { url, logoUrl } = params;
	const html = applyEmailBrandPlaceholders(
		resetPasswordHtml.replace(/\{\{url\}\}/g, url),
		{ logoUrl }
	);
	const plainText = `Reset your password by opening this link: ${url}`;
	return { html, plainText };
}
