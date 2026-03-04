/**
 * Renders the reset-password email template.
 * Used by auth server when sending password reset emails.
 */
import resetPasswordHtml from './reset-password.html?raw';

export interface ResetPasswordEmailParams {
	url: string;
}

export function renderResetPasswordEmail(
	params: ResetPasswordEmailParams
): {
	html: string;
	plainText: string;
} {
	const { url } = params;
	const html = resetPasswordHtml.replace(/\{\{url\}\}/g, url);
	const plainText = `Reset your password by opening this link: ${url}`;
	return { html, plainText };
}
