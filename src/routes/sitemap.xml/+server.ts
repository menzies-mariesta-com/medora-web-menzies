import type { RequestHandler } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';
import {
	PUBLIC_SITEMAP_PATHS,
	absoluteUrl
} from '$lib/util/seo.util';

/** SSR so `<loc>` uses the live deploy origin, not a build-time localhost default. */

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** Canonical indexable public URLs only (cookie locale; no /xx/ duplicates). */
export const GET: RequestHandler = async () => {
	const origin = getSiteOrigin();
	const lastmod = new Date().toISOString().slice(0, 10);

	const urls = PUBLIC_SITEMAP_PATHS.map((path) => {
		const loc = absoluteUrl(origin, path);
		const priority = path === '/' ? '1.0' : '0.8';
		return [
			'  <url>',
			`    <loc>${escapeXml(loc)}</loc>`,
			`    <lastmod>${lastmod}</lastmod>`,
			'    <changefreq>weekly</changefreq>',
			`    <priority>${priority}</priority>`,
			'  </url>'
		].join('\n');
	}).join('\n');

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		urls,
		'</urlset>',
		''
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
		}
	});
};
