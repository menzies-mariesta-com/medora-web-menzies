import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TigrisUtil } from '$lib/util/tigris.util.svelte';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'application/pdf'
];

/** Server may receive Blob or File from formData(); accept any blob-like (avoids instanceof across runtimes). */
function isFileLike(value: unknown): value is Blob & { name?: string } {
	if (typeof value !== 'object' || value === null) return false;
	const o = value as Record<string, unknown>;
	return (
		typeof o.size === 'number' &&
		typeof o.type === 'string' &&
		(typeof o.arrayBuffer === 'function' || typeof o.stream === 'function')
	);
}

function getExt(blob: Blob & { name?: string }): string {
	const name = blob.name?.trim();
	if (name && name.includes('.')) {
		const ext = name.split('.').pop()?.toLowerCase();
		if (ext) return ext;
	}
	const type = blob.type?.toLowerCase();
	if (type === 'image/jpeg') return 'jpg';
	if (type?.includes('/')) return type.split('/')[1] || 'bin';
	return 'bin';
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file');
		if (!file || !isFileLike(file)) {
			return json(
				{ error: 'Missing or invalid file (use field name "file")' },
				{ status: 400 }
			);
		}
		if (file.size > MAX_SIZE_BYTES) {
			return json({ error: 'File too large (max 10MB)' }, { status: 400 });
		}
		const type = file.type?.toLowerCase();
		if (!type || !ALLOWED_TYPES.includes(type)) {
			return json(
				{ error: 'Invalid file type. Use JPEG, PNG, WebP, GIF or PDF.' },
				{ status: 400 }
			);
		}

		const ext = getExt(file);
		const path = `grn-invoices/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
		await TigrisUtil.upload(path, file, {
			contentType: type,
			access: 'public'
		});
		return json({ url: `/api/grn-invoice/${path}` });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Upload failed';
		return json({ error: message }, { status: 500 });
	}
};

