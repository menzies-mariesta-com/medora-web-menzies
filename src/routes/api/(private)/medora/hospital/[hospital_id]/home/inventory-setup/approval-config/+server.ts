import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getStaffApprovalMatrix,
	listStoresForApprovalConfig,
	saveStaffApprovalMatrix
} from '$lib/server/medora/inventory/approval-config.server';
import {
	isInvApprovalModule,
	type InvApprovalModule
} from '$lib/model/type/medora/inv-approval.type';
import type { InvApprovalStaffMatrixCell } from '$lib/model/type/medora/inv-approval-config.type';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = event.url.searchParams.get('mode');
	if (mode === 'stores') {
		const data = await listStoresForApprovalConfig(event, hospitalId);
		return json(data);
	}
	if (mode === 'staffMatrix') {
		const staffId = (event.url.searchParams.get('staffId') ?? '').trim();
		if (!staffId) {
			return json({ error: 'Select a staff member' }, { status: 400 });
		}
		const data = await getStaffApprovalMatrix(event, {
			hospitalId,
			staffId
		});
		return json(data);
	}
	return json({ error: 'Invalid mode' }, { status: 400 });
};

function parseMatrixCells(raw: unknown): InvApprovalStaffMatrixCell[] {
	if (!Array.isArray(raw)) return [];
	const out: InvApprovalStaffMatrixCell[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const o = item as Record<string, unknown>;
		const storeId = Number(o.storeId);
		const moduleRaw = String(o.module ?? '');
		if (!Number.isFinite(storeId) || storeId < 1) continue;
		if (!isInvApprovalModule(moduleRaw)) continue;
		out.push({
			storeId,
			module: moduleRaw as InvApprovalModule,
			canApprove: o.canApprove === true
		});
	}
	return out;
}

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const staffId = String(body.staffId ?? '').trim();
	if (!staffId) {
		return json({ error: 'Staff is required' }, { status: 400 });
	}
	const cells = parseMatrixCells(body.cells);
	if (cells.length === 0) {
		return json({ error: 'No permissions to save' }, { status: 400 });
	}
	await saveStaffApprovalMatrix(event, {
		hospitalId,
		staffId,
		cells
	});
	return json({ ok: true });
};
