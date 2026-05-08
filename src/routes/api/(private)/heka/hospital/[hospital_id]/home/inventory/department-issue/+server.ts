import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createDepartmentIssue,
	getDepartmentIssueById,
	listDepartmentIssues
} from '$lib/server/heka/inventory/department-issue.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const id = event.url.searchParams.get('id');
	if (id) {
		const row = await getDepartmentIssueById(event, { hospitalId, id });
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
	const sourceIndentIdStr = event.url.searchParams.get('sourceIndentId');
	const sourceIndentId =
		sourceIndentIdStr != null && sourceIndentIdStr.trim() !== ''
			? sourceIndentIdStr.trim()
			: undefined;
	const issueNoRaw = event.url.searchParams.get('issueNo');
	const issueNo =
		issueNoRaw != null && issueNoRaw !== '' ? issueNoRaw : undefined;

	const data = await listDepartmentIssues(event, {
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
		sourceIndentId,
		issueNo
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const lines = (body.lines as Record<string, unknown>[]) ?? [];

	const data = await createDepartmentIssue(event, {
		hospitalId,
		fromStoreId: Number(body.fromStoreId ?? 0),
		toStoreId: Number(body.toStoreId ?? 0),
		sourceIndentId:
			body.sourceIndentId != null && String(body.sourceIndentId).trim() !== ''
				? String(body.sourceIndentId).trim()
				: null,
		remarks: body.remarks != null ? String(body.remarks) : null,
		lines: lines.map((l) => ({
			itemId: Number(l.itemId ?? 0),
			quantity: String(l.quantity ?? '0'),
			unitId: Number(l.unitId ?? 0),
			batchId: Number(l.batchId ?? 0)
		}))
	});

	return json(data);
};

