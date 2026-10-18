import type { RequestHandler } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';
import { PUBLIC_SITEMAP_PATHS, absoluteUrl } from '$lib/util/seo.util';
import { getDocsManifest } from '$lib/docs/load-doc.server';

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export const GET: RequestHandler = async () => {
	const origin = getSiteOrigin();
	const lastmod = new Date().toISOString().slice(0, 10);
	const manifest = getDocsManifest();
	const paths = [
		...PUBLIC_SITEMAP_PATHS,
		...manifest.prerenderPaths.filter((p) => p !== '/docs')
	];

	const urls = [...new Set(paths)]
		.map((path) => {
			const loc = absoluteUrl(origin, path);
			const priority = path === '/' ? '1.0' : path.startsWith('/docs') ? '0.7' : '0.8';
			return [
				'  <url>',
				`    <loc>${escapeXml(loc)}</loc>`,
				`    <lastmod>${lastmod}</lastmod>`,
				'    <changefreq>weekly</changefreq>',
				`    <priority>${priority}</priority>`,
				'  </url>'
			].join('\n');
		})
		.join('\n');

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
