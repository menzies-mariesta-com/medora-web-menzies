/**
 * Shared Medora branding for transactional email HTML.
 * Logo must be an absolute URL so email clients can load it.
 */
import { env } from '$env/dynamic/private';

export const EMAIL_BRAND_NAME = 'Medora';

/** Public path under `static/` (and mirrored in `$lib/asset/image/`). */
export const EMAIL_LOGO_PATH = '/medora-logo.svg';

/**
 * Public site origin for absolute asset URLs in email.
 * Prefers `BETTER_AUTH_BASE_URL`, then `BETTER_AUTH_URL`, then local default.
 */
export function resolveEmailAppOrigin(): string {
	const raw =
		env.BETTER_AUTH_BASE_URL?.trim() ||
		env.BETTER_AUTH_URL?.trim() ||
		'http://localhost:4002';
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
	const logoUrl = opts?.logoUrl ?? resolveEmailLogoUrl();
	const brandName = opts?.brandName ?? EMAIL_BRAND_NAME;
	return html
		.replace(/\{\{logoUrl\}\}/g, logoUrl)
		.replace(/\{\{brandName\}\}/g, brandName);
}
