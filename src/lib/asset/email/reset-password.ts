/**
 * Renders the reset-password email template.
 * Used by auth server when sending password reset emails.
 */
import { applyEmailBrandPlaceholders, emailLogoSrcForSend } from './email-brand';
import {
	buildMedoraEmailDocument,
	emailCardFootnote,
	emailHeadingStyle,
	emailLeadStyle,
	emailPrimaryButton
} from './email-layout';

export interface ResetPasswordEmailParams {
	url: string;
	logoUrl?: string;
}

export function renderResetPasswordEmail(
	params: ResetPasswordEmailParams
): {
	html: string;
	plainText: string;
} {
	const { url, logoUrl } = params;
	const resolvedLogo = logoUrl ?? emailLogoSrcForSend();
	const cardBody = `
		<h1 style="${emailHeadingStyle}">Reset your password</h1>
		<p style="${emailLeadStyle}">
			We received a request to change the password on your Medora account.
			Tap the button below to choose a new password. This link is for you only.
		</p>
		${emailPrimaryButton(url, 'Reset password')}
		${emailCardFootnote(
			"If you didn't ask for this, you can safely ignore this email — your password won't change."
		)}`;
	const html = applyEmailBrandPlaceholders(
		buildMedoraEmailDocument({
			pageTitle: 'Reset your password · Medora',
			preheader: 'Use this link to set a new Medora password.',
			cardBodyHtml: cardBody,
			logoUrl: resolvedLogo,
			brandName: 'Medora'
		}),
		{ logoUrl: resolvedLogo }
	);
	const plainText = `Reset your Medora password by opening this link: ${url}\n\nIf you didn't request this, ignore this email.`;
	return { html, plainText };
}