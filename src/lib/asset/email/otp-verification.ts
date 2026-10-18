/**
 * Renders the email OTP verification template.
 * Used by better-auth emailOTP plugin.
 */
import otpVerificationHtml from './otp-verification.html?raw';
import { applyEmailBrandPlaceholders } from './email-brand';

export type OtpEmailType =
	| 'sign-in'
	| 'email-verification'
	| 'forget-password';

export interface OtpVerificationEmailParams {
	otp: string;
	type: OtpEmailType;
	/** Absolute logo URL; defaults from BETTER_AUTH_BASE_URL / BETTER_AUTH_URL. */
	logoUrl?: string;
}

function introForType(type: OtpEmailType): string {
	switch (type) {
		case 'sign-in':
			return 'Use this one-time code to sign in to your account.';
		case 'forget-password':
			return 'Use this one-time code to reset your password.';
		case 'email-verification':
		default:
			return 'Use this one-time code to verify your email address.';
	}
}

function subjectForType(type: OtpEmailType): string {
	switch (type) {
		case 'sign-in':
			return 'Your sign-in code · Medora';
		case 'forget-password':
			return 'Your password reset code · Medora';
		case 'email-verification':
		default:
			return 'Your verification code · Medora';
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
	const html = applyEmailBrandPlaceholders(
		otpVerificationHtml
			.replace(/\{\{otp\}\}/g, otp)
			.replace(/\{\{intro\}\}/g, intro),
		{ logoUrl }
	);
	const plainText = `${intro}\n\nCode: ${otp}\n\nThis code expires in 10 minutes.`;
	return { html, plainText, subject: subjectForType(type) };
}
