import type { RequestHandler } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';

/**
 * Crawl policy: index public marketing/docs; keep auth, onboarding, app, APIs out.
 * SSR (not prerender) so Sitemap origin matches deploy env at request time.
 */
export const GET: RequestHandler = async () => {
	const origin = getSiteOrigin();
	const body = [
		'User-agent: *',
		'Allow: /',
		'Disallow: /auth',
		'Disallow: /auth/',
		'Disallow: /onboarding',
		'Disallow: /onboarding/',
		'Disallow: /medora',
		'Disallow: /medora/',
		'Disallow: /api/',
		'Disallow: /heka',
		'Disallow: /heka/',
		'',
		`Sitemap: ${origin}/sitemap.xml`,
		''
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
		}
	});
};
