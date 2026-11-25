/**
 * Renders the email OTP verification template.
 * Used by better-auth emailOTP plugin.
 */
import { applyEmailBrandPlaceholders, emailLogoSrcForSend } from './email-brand';
import {
	buildMedoraEmailDocument,
	emailCardFootnote,
	emailHeadingStyle,
	emailLeadStyle
} from './email-layout';
import { escapeHtml } from './email-escape';

export type OtpEmailType =
	| 'sign-in'
	| 'email-verification'
	| 'forget-password'
	| 'change-email';

export interface OtpVerificationEmailParams {
	otp: string;
	type: OtpEmailType;
	logoUrl?: string;
}

function introForType(type: OtpEmailType): string {
	switch (type) {
		case 'sign-in':
			return 'Here is your one-time sign-in code. Enter it on the Medora sign-in screen to continue.';
		case 'forget-password':
			return 'Here is your one-time code to confirm your identity before you set a new password.';
		case 'email-verification':
		default:
			return 'Here is your one-time code to confirm this email address for your Medora account.';
	}
}

function subjectForType(type: OtpEmailType): string {
	switch (type) {
		case 'sign-in':
			return 'Your Medora sign-in code';
		case 'forget-password':
			return 'Your Medora password reset code';
		case 'email-verification':
		default:
			return 'Your Medora verification code';
	}
}

function preheaderForType(type: OtpEmailType): string {
	switch (type) {
		case 'sign-in':
			return 'Your sign-in code expires in 10 minutes.';
		case 'forget-password':
			return 'Your password reset code expires in 10 minutes.';
		default:
			return 'Your verification code expires in 10 minutes.';
	}
}

export function renderOtpVerificationEmail(
	params: OtpVerificationEmailParams
): {
	html: string;
	plainText: string;
	subject: string;
} {
	const { otp, type, logoUrl } = params;
	const intro = introForType(type);
	const resolvedLogo = logoUrl ?? emailLogoSrcForSend();
	const cardBody = `
		<h1 style="${emailHeadingStyle}">Your verification code</h1>
		<p style="${emailLeadStyle}">${escapeHtml(intro)}</p>
		<p style="margin:0 0 8px;font-size:34px;letter-spacing:0.28em;font-weight:700;color:#0f766e;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(otp)}</p>
		${emailCardFootnote(
			'This code expires in 10 minutes. If you did not request it, you can ignore this email.'
		)}`;
	const html = applyEmailBrandPlaceholders(
		buildMedoraEmailDocument({
			pageTitle: `${subjectForType(type)} · Medora`,
			preheader: preheaderForType(type),
			cardBodyHtml: cardBody,
			logoUrl: resolvedLogo,
			brandName: 'Medora'
		}),
		{ logoUrl: resolvedLogo }
	);
	const plainText = `${intro}\n\nCode: ${otp}\n\nThis code expires in 10 minutes.`;
	return { html, plainText, subject: subjectForType(type) };
}