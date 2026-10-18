import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { captureWorkflowImageUrl } from '$lib/docs/capture-paths';
import { resolveCaptureImageUrl } from '$lib/docs/capture-images.server';

/** Redirect legacy logical capture URLs to bundled asset URLs. */
export const GET: RequestHandler = ({ params }) => {
	const segments = params.path?.split('/').filter(Boolean) ?? [];
	if (segments.length !== 2) {
		throw error(404, 'Not found');
	}
	const [slug, fileName] = segments;
	const logical = captureWorkflowImageUrl(slug, fileName);
	const assetUrl = resolveCaptureImageUrl(logical);
	if (!assetUrl) {
		throw error(404, 'Not found');
	}
	throw redirect(302, assetUrl);
};
