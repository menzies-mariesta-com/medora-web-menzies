import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TigrisUtil } from '$lib/util/tigris.util.svelte';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif'
];

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('photo') as File | null;
		if (!file || !(file instanceof File)) {
			return json(
				{ error: 'Missing or invalid file (use field name "photo")' },
				{ status: 400 }
			);
		}
		if (file.size > MAX_SIZE_BYTES) {
			return json(
				{ error: 'File too large (max 5MB)' },
				{ status: 400 }
			);
		}
		const type = file.type?.toLowerCase();
		if (!type || !ALLOWED_TYPES.includes(type)) {
			return json(
				{ error: 'Invalid file type. Use JPEG, PNG, WebP or GIF.' },
				{ status: 400 }
			);
		}
		const ext =
			type === 'image/jpeg' ? 'jpg' : type.split('/')[1] || 'bin';
		const path = `staff-photos/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
		await TigrisUtil.upload(path, file, {
			contentType: type,
			access: 'public'
		});
		// Return proxy URL so images load with our server's get permission (no public bucket required)
		return json({ url: `/api/staff-photo/${path}` });
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Upload failed';
		return json({ error: message }, { status: 500 });
	}
};
