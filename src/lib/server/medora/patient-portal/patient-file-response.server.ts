import type { RequestEvent } from '@sveltejs/kit';
import { TigrisUtil } from '$lib/util/tigris.util.svelte';
import { applyCorsToResponse } from '$lib/server/http/cors-patient-api.server';

/** Stream a private Tigris object with no client-side caching. */
export async function streamPatientStorageObject(
	event: RequestEvent,
	storageKey: string,
	contentType: string,
	filename?: string
): Promise<Response> {
	let stream: ReadableStream | null = null;
	try {
		stream = await TigrisUtil.downloadStream(storageKey);
	} catch {
		return new Response('Not Found', { status: 404 });
	}
	if (!stream) {
		return new Response('Not Found', { status: 404 });
	}

	const headers = new Headers({
		'Content-Type': contentType,
		'Cache-Control': 'private, no-store',
		'X-Content-Type-Options': 'nosniff'
	});
	if (filename) {
		headers.set(
			'Content-Disposition',
			`inline; filename="${filename.replace(/["\\\r\n]/g, '_')}"`
		);
	}

	return applyCorsToResponse(
		new Response(stream, { status: 200, headers }),
		event.request
	);
}
