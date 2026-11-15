/**
 * Shared Medora branding for transactional email HTML.
 * Logo must be an absolute URL so email clients can load it.
 */
import { env } from '$env/dynamic/private';

export const EMAIL_BRAND_NAME = 'Medora';

/**
 * Raster logo for email (`static/medora-logo-email.png`).
 * shortcut: SVG in static/ is not shown in many clients (Gmail, Outlook), use PNG.
 */
export const EMAIL_LOGO_PATH = '/medora-logo-email.png';

/** MIME Content-ID for inline logo attachment in transactional mail. */
export const EMAIL_LOGO_CID = 'medora-logo@medora';

/** `<img src>` for HTML sent via SMTP (logo attached with this CID). */
export function emailLogoSrcForSend(): string {
	return `cid:${EMAIL_LOGO_CID}`;
}

/**
 * Public site origin for absolute asset URLs in email.
 * Prefers `BETTER_AUTH_BASE_URL`, then `BETTER_AUTH_URL`, then `ORIGIN`, then local default.
 */
export function resolveEmailAppOrigin(): string {
	const candidates = [
		env.BETTER_AUTH_BASE_URL?.trim(),
		env.BETTER_AUTH_URL?.trim(),
		env.ORIGIN?.trim()
	].filter(Boolean) as string[];
	const raw = candidates[0] ?? 'http://localhost:4002';
	try {
		return new URL(raw).origin;
	} catch {
		return 'http://localhost:4002';
	}
}

/** Absolute logo URL for `<img src>` in email HTML. */
export function resolveEmailLogoUrl(appOrigin?: string): string {
	const origin = (appOrigin ?? resolveEmailAppOrigin()).replace(
		/\/$/,
		''
	);
	return `${origin}${EMAIL_LOGO_PATH}`;
}

/** Inject `{{logoUrl}}` and `{{brandName}}` into a raw HTML template. */
export function applyEmailBrandPlaceholders(
	html: string,
	opts?: { logoUrl?: string; brandName?: string }
): string {
	const logoUrl = opts?.logoUrl ?? emailLogoSrcForSend();
	const brandName = opts?.brandName ?? EMAIL_BRAND_NAME;
	return html
		.replace(/\{\{logoUrl\}\}/g, logoUrl)
		.replace(/\{\{brandName\}\}/g, brandName);
}
