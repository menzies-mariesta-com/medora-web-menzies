import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	deleteApprovalLevel,
	listApprovalLevelsForStore,
	listStoresForApprovalConfig,
	upsertApprovalLevel,
	type InvApprovalModule
} from '$lib/server/heka/inventory/approval-config.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = event.url.searchParams.get('mode');
	if (mode === 'stores') {
		const data = await listStoresForApprovalConfig(event, hospitalId);
		return json(data);
	}
	const storeIdStr = event.url.searchParams.get('storeId');
	const module = event.url.searchParams.get('module') as InvApprovalModule | null;
	if (!storeIdStr) {
		return json({ error: 'storeId required' }, { status: 400 });
	}
	const storeId = Number(storeIdStr);
	const data = await listApprovalLevelsForStore(event, {
		hospitalId,
		storeId,
		module: module ?? undefined
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const storeId = Number(body.storeId ?? 0);
	const module = String(body.module ?? '') as InvApprovalModule;
	const level = Number(body.level ?? 0);
	const id = body.id != null ? Number(body.id) : undefined;
	const assigneeStaffIds = Array.isArray(body.assigneeStaffIds)
		? (body.assigneeStaffIds as unknown[]).map((x) => String(x))
		: [];
	if (module !== 'PR' && module !== 'PO') {
		return json({ error: 'Invalid module' }, { status: 400 });
	}
	const result = await upsertApprovalLevel(event, {
		hospitalId,
		storeId,
		module,
		level,
		id: Number.isFinite(id) ? id : undefined,
		assigneeStaffIds
	});
	return json(result);
};

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteApprovalLevel(event, {
		hospitalId,
		levelId: Number(body.levelId ?? 0)
	});
	return json({ ok: true });
};
