import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	listAdminGlobalDocuments,
	reseedAdminGlobalDocuments,
	updateAdminGlobalDocument
} from '$lib/server/medora/admin/admin-global-document.server';

export const GET: RequestHandler = async (event) => {
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '20');
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== ''
			? Number(statusIdStr)
			: null;

	const data = await listAdminGlobalDocuments(event, {
		page,
		pageSize,
		statusId: statusId ?? undefined
	});
	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const updated = await updateAdminGlobalDocument(event, {
		id: Number(body.id),
		code: body.code === undefined ? undefined : body.code != null ? String(body.code) : null,
		locale:
			body.locale === undefined
				? undefined
				: body.locale != null
					? String(body.locale)
					: 'en',
		documentNumber:
			body.documentNumber === undefined
				? undefined
				: body.documentNumber != null
					? String(body.documentNumber)
					: null,
		documentText:
			body.documentText === undefined
				? undefined
				: body.documentText != null
					? String(body.documentText)
					: null,
		clinicalSection:
			body.clinicalSection === undefined
				? undefined
				: body.clinicalSection != null
					? String(body.clinicalSection)
					: null,
		statusId:
			body.statusId === undefined
				? undefined
				: body.statusId != null
					? Number(body.statusId)
					: undefined
	});
	return json(updated);
};

export const POST: RequestHandler = async (event) => {
	const result = await reseedAdminGlobalDocuments(event);
	return json(result);
};
