import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createDocumentSetting,
	deleteDocumentSetting,
	getDocumentSettingsPaginated,
	updateDocumentSetting
} from '$lib/server/medora/document-master/document-setting.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== ''
			? Number(statusIdStr)
			: null;

	const includeGlobal =
		event.url.searchParams.get('includeGlobal') === 'true';

	const data = await getDocumentSettingsPaginated(event, {
		hospitalId,
		page,
		pageSize,
		statusId: statusId ?? undefined,
		includeGlobal
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const data = await createDocumentSetting(event, {
		hospitalId,
		name: String(body.name ?? ''),
		documentTypeId:
			body.documentTypeId != null
				? Number(body.documentTypeId)
				: null,
		description:
			body.description != null ? String(body.description) : null,
		pageSize: body.pageSize != null ? String(body.pageSize) : null,
		pageOrientation:
			body.pageOrientation != null
				? String(body.pageOrientation)
				: null,
		marginTop: body.marginTop != null ? Number(body.marginTop) : null,
		marginBottom:
			body.marginBottom != null ? Number(body.marginBottom) : null,
		marginLeft:
			body.marginLeft != null ? Number(body.marginLeft) : null,
		marginRight:
			body.marginRight != null ? Number(body.marginRight) : null,
		paddingTop:
			body.paddingTop != null ? Number(body.paddingTop) : null,
		paddingBottom:
			body.paddingBottom != null ? Number(body.paddingBottom) : null,
		paddingLeft:
			body.paddingLeft != null ? Number(body.paddingLeft) : null,
		paddingRight:
			body.paddingRight != null ? Number(body.paddingRight) : null,
		showHeader:
			body.showHeader != null ? Boolean(body.showHeader) : null,
		showFooter:
			body.showFooter != null ? Boolean(body.showFooter) : null,
		headerHtml:
			body.headerHtml != null ? String(body.headerHtml) : null,
		footerHtml:
			body.footerHtml != null ? String(body.footerHtml) : null,
		statusId:
			body.statusId != null ? Number(body.statusId) : undefined
	});
	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const data = await updateDocumentSetting(event, {
		id: Number(body.id),
		name: body.name != null ? String(body.name) : undefined,
		documentTypeId:
			body.documentTypeId === undefined
				? undefined
				: body.documentTypeId != null
					? Number(body.documentTypeId)
					: null,
		description:
			body.description === undefined
				? undefined
				: body.description != null
					? String(body.description)
					: null,
		pageSize:
			body.pageSize === undefined
				? undefined
				: body.pageSize != null
					? String(body.pageSize)
					: null,
		pageOrientation:
			body.pageOrientation === undefined
				? undefined
				: body.pageOrientation != null
					? String(body.pageOrientation)
					: null,
		marginTop:
			body.marginTop === undefined
				? undefined
				: body.marginTop != null
					? Number(body.marginTop)
					: null,
		marginBottom:
			body.marginBottom === undefined
				? undefined
				: body.marginBottom != null
					? Number(body.marginBottom)
					: null,
		marginLeft:
			body.marginLeft === undefined
				? undefined
				: body.marginLeft != null
					? Number(body.marginLeft)
					: null,
		marginRight:
			body.marginRight === undefined
				? undefined
				: body.marginRight != null
					? Number(body.marginRight)
					: null,
		paddingTop:
			body.paddingTop === undefined
				? undefined
				: body.paddingTop != null
					? Number(body.paddingTop)
					: null,
		paddingBottom:
			body.paddingBottom === undefined
				? undefined
				: body.paddingBottom != null
					? Number(body.paddingBottom)
					: null,
		paddingLeft:
			body.paddingLeft === undefined
				? undefined
				: body.paddingLeft != null
					? Number(body.paddingLeft)
					: null,
		paddingRight:
			body.paddingRight === undefined
				? undefined
				: body.paddingRight != null
					? Number(body.paddingRight)
					: null,
		showHeader:
			body.showHeader === undefined
				? undefined
				: body.showHeader != null
					? Boolean(body.showHeader)
					: null,
		showFooter:
			body.showFooter === undefined
				? undefined
				: body.showFooter != null
					? Boolean(body.showFooter)
					: null,
		headerHtml:
			body.headerHtml === undefined
				? undefined
				: body.headerHtml != null
					? String(body.headerHtml)
					: null,
		footerHtml:
			body.footerHtml === undefined
				? undefined
				: body.footerHtml != null
					? String(body.footerHtml)
					: null,
		statusId:
			body.statusId === undefined
				? undefined
				: body.statusId != null
					? Number(body.statusId)
					: undefined
	});
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	await deleteDocumentSetting(event, { id: Number(body.id) });
	return json({ ok: true });
};
