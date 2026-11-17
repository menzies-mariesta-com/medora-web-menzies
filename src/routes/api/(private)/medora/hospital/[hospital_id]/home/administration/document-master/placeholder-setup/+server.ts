import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	createTextPlaceholder,
	deleteTextPlaceholder,
	listSystemPlaceholderMetadata,
	listTextPlaceholders,
	updateTextPlaceholder
} from '$lib/server/medora/document-master/text-placeholder.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id ?? '';
	const mode = event.url.searchParams.get('mode') ?? 'list';
	if (mode === 'system') {
		return json({ placeholders: listSystemPlaceholderMetadata() });
	}
	const rows = await listTextPlaceholders(event, hospitalId);
	return json({ rows });
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id ?? '';
	const body = (await event.request.json()) as Record<string, unknown>;
	const row = await createTextPlaceholder(event, {
		hospitalId,
		code: String(body.code ?? ''),
		text: String(body.text ?? ''),
		description: body.description != null ? String(body.description) : null
	});
	return json(row);
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id ?? '';
	const body = (await event.request.json()) as Record<string, unknown>;
	const id = Number(body.id);
	if (!Number.isFinite(id)) throw error(400, 'id is required');
	const row = await updateTextPlaceholder(event, {
		hospitalId,
		id,
		text: body.text != null ? String(body.text) : undefined,
		description:
			body.description !== undefined
				? body.description != null
					? String(body.description)
					: null
				: undefined
	});
	return json(row);
};

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id ?? '';
	const body = (await event.request.json()) as Record<string, unknown>;
	const id = Number(body.id);
	if (!Number.isFinite(id)) throw error(400, 'id is required');
	await deleteTextPlaceholder(event, { hospitalId, id });
	return json({ ok: true });
};
