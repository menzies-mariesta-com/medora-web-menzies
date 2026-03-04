import type { RequestHandler } from './$types';
import { TigrisUtil } from '$lib/util/tigris.util.svelte';

const CONTENT_TYPES: Record<string, string> = {
	webp: 'image/webp',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif'
};

export const GET: RequestHandler = async ({ params }) => {
	const path = Array.isArray(params.path)
		? params.path.join('/')
		: params.path;
	if (!path || path.includes('..')) {
		return new Response('Bad Request', { status: 400 });
	}
	if (!path.startsWith('staff-photos/')) {
		return new Response('Forbidden', { status: 403 });
	}
	try {
		const stream = await TigrisUtil.downloadStream(path);
		if (!stream) {
			return new Response('Not Found', { status: 404 });
		}
		const ext = path.split('.').pop()?.toLowerCase() ?? '';
		const contentType =
			CONTENT_TYPES[ext] ?? 'application/octet-stream';
		return new Response(stream, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=3600'
			}
		});
	} catch {
		return new Response('Not Found', { status: 404 });
	}
};
