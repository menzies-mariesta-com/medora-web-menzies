import { describe, expect, it } from 'vitest';
import { renderPlanGrantedEmail } from './plan-granted';

const base = {
	fullName: 'Ada Lovelace',
	hospitalName: 'Sample Hospital',
	pricingTier: 'starter',
	billingModeLabel: 'Trial',
	planDetailLabel: '7 days',
	periodEndLabel: 'Nov 20, 2026',
	loginUrl: 'https://app.example/auth/login'
};

describe('renderPlanGrantedEmail', () => {
	it('uses set-password CTA when resetUrl is present', () => {
		const mail = renderPlanGrantedEmail({
			...base,
			resetUrl: 'https://app.example/reset?token=x'
		});
		expect(mail.subject).toContain('approved');
		expect(mail.html).toContain('Set your password');
		expect(mail.html).toContain('cid:medora-logo@medora');
		expect(mail.html).toContain('Your current plan');
		expect(mail.plainText).toContain('Set your password:');
	});

	it('uses sign-in CTA when resetUrl is null', () => {
		const mail = renderPlanGrantedEmail({ ...base, resetUrl: null });
		expect(mail.html).toContain('Sign in to Medora');
	});
});
