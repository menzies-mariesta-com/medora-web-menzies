import { isHttpError, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertCanUploadHospitalLogo } from '$lib/server/medora/hospital.server';
import { TigrisUtil } from '$lib/util/tigris.util.svelte';
import { uuidV7 } from '$lib/util/id.util';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif'
];

export const POST: RequestHandler = async (event) => {
	await assertCanUploadHospitalLogo(event);

	try {
		const formData = await event.request.formData();
		const file = formData.get('logo') as File | null;
		if (!file || !(file instanceof File)) {
			return json(
				{ error: 'Missing or invalid file (use field name "logo")' },
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
		const path = `hospital-logos/${Date.now()}-${uuidV7().slice(0, 8)}.${ext}`;
		await TigrisUtil.upload(path, file, {
			contentType: type,
			access: 'public'
		});
		// Proxy URL so images load with our server's get permission
		return json({ url: `/api/hospital-logo/${path}` });
	} catch (err) {
		if (isHttpError(err)) throw err;
		const message =
			err instanceof Error ? err.message : 'Upload failed';
		return json({ error: message }, { status: 500 });
	}
};
