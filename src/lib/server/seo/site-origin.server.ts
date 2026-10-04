import { env } from '$env/dynamic/private';
import { normalizeOrigin } from '$lib/util/seo.util';

/**
 * Public site origin for canonical URLs, sitemap, and robots.
 * Prefer BETTER_AUTH_BASE_URL / BETTER_AUTH_URL in deploy env.
 */
export function getSiteOrigin(): string {
	return normalizeOrigin(
		env.BETTER_AUTH_BASE_URL ||
			env.BETTER_AUTH_URL ||
			'http://localhost:4002'
	);
}
