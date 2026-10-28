import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TigrisUtil } from '$lib/util/tigris.util.svelte';
import { uuidV7 } from '$lib/util/id.util';
import { RoleEnum } from '$lib/model/enum/db-link';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif'
];

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json(
			{ error: 'Authentication required' },
			{ status: 401 }
		);
	}
	if (locals.userRoleId === RoleEnum.PATIENT) {
		return json(
			{ error: 'Patient accounts cannot upload files' },
			{ status: 403 }
		);
	}
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
		const path = `patient-photos/${Date.now()}-${uuidV7().slice(0, 8)}.${ext}`;
		await TigrisUtil.upload(path, file, {
			contentType: type,
			access: 'private'
		});
		return json({ url: `/api/patient-photo/${path}` });
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Upload failed';
		return json({ error: message }, { status: 500 });
	}
};
