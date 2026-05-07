import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createDepartmentIndent,
	getDepartmentIndentById,
	listDepartmentIndents
} from '$lib/server/heka/inventory/department-indent.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const id = event.url.searchParams.get('id');
	if (id) {
		const row = await getDepartmentIndentById(event, { hospitalId, id });
		return json(row);
	}
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const fromStoreIdStr = event.url.searchParams.get('fromStoreId');
	const toStoreIdStr = event.url.searchParams.get('toStoreId');
	const statusIdStr = event.url.searchParams.get('statusTaggingId');
	const fromStoreId =
		fromStoreIdStr != null && fromStoreIdStr !== ''
			? Number(fromStoreIdStr)
			: undefined;
	const toStoreId =
		toStoreIdStr != null && toStoreIdStr !== ''
			? Number(toStoreIdStr)
			: undefined;
	const statusTaggingId =
		statusIdStr != null && statusIdStr !== ''
			? Number(statusIdStr)
			: undefined;
	const indentNoRaw = event.url.searchParams.get('indentNo');
	const indentNo =
		indentNoRaw != null && indentNoRaw !== '' ? indentNoRaw : undefined;
	const data = await listDepartmentIndents(event, {
		hospitalId,
		page,
		pageSize,
		fromStoreId: Number.isFinite(fromStoreId as number)
			? fromStoreId
			: undefined,
		toStoreId: Number.isFinite(toStoreId as number) ? toStoreId : undefined,
		statusTaggingId: Number.isFinite(statusTaggingId as number)
			? statusTaggingId
			: undefined,
		indentNo
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const lines = (body.lines as Record<string, unknown>[]) ?? [];
	const data = await createDepartmentIndent(event, {
		hospitalId,
		fromStoreId: Number(body.fromStoreId ?? 0),
		toStoreId: Number(body.toStoreId ?? 0),
		remarks: body.remarks != null ? String(body.remarks) : null,
		lines: lines.map((l) => ({
			itemId: Number(l.itemId ?? 0),
			quantity: String(l.quantity ?? '0'),
			unitId: Number(l.unitId ?? 0)
		}))
	});
	return json(data);
};
