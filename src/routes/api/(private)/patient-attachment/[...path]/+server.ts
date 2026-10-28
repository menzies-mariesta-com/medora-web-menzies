import type { RequestHandler } from './$types';
import { canAccessPatientAttachment } from '$lib/server/medora/patient-portal/patient-file-access.server';
import { streamPatientStorageObject } from '$lib/server/medora/patient-portal/patient-file-response.server';

const CONTENT_TYPES: Record<string, string> = {
	webp: 'image/webp',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	pdf: 'application/pdf'
};

export const GET: RequestHandler = async (event) => {
	const { params } = event;
	const path = Array.isArray(params.path)
		? params.path.join('/')
		: params.path;
	if (!path || path.includes('..')) {
		return new Response('Bad Request', { status: 400 });
	}
	if (!path.startsWith('patient-attachments/')) {
		return new Response('Forbidden', { status: 403 });
	}
	if (!event.locals.user) {
		return new Response('Authentication required', { status: 401 });
	}
	if (!(await canAccessPatientAttachment(event, path))) {
		return new Response('Forbidden', { status: 403 });
	}
	const ext = path.split('.').pop()?.toLowerCase() ?? '';
	const contentType =
		CONTENT_TYPES[ext] ?? 'application/octet-stream';
	try {
		return await streamPatientStorageObject(event, path, contentType);
	} catch {
		return new Response('Not Found', { status: 404 });
	}
};
