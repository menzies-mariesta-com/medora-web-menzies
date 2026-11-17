import { describe, expect, it } from 'vitest';
import {
	EMAIL_LOGO_CID,
	EMAIL_LOGO_PATH,
	emailLogoSrcForSend,
	resolveEmailLogoUrl
} from './email-brand';

describe('resolveEmailLogoUrl', () => {
	it('returns absolute PNG URL on a given origin', () => {
		const url = resolveEmailLogoUrl('https://app.medora.example');
		expect(url).toBe(`https://app.medora.example${EMAIL_LOGO_PATH}`);
		expect(url).toContain('.png');
		expect(url).not.toContain('.svg');
	});

	it('uses raster logo path for email client compatibility', () => {
		expect(EMAIL_LOGO_PATH).toBe('/medora-logo-email.png');
	});

	it('uses CID src for SMTP inline logo', () => {
		expect(EMAIL_LOGO_CID).toBe('medora-logo@medora');
		expect(emailLogoSrcForSend()).toBe('cid:medora-logo@medora');
	});
});