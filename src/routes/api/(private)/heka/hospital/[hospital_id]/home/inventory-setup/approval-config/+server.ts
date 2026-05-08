import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	deleteApprovalLevel,
	listApprovalLevelsForStore,
	listStoresForApprovalConfig,
	upsertApprovalLevel
} from '$lib/server/heka/inventory/approval-config.server';
import {
	isInvApprovalModule,
	type InvApprovalModule
} from '$lib/model/type/heka/inv-approval.type';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = event.url.searchParams.get('mode');
	if (mode === 'stores') {
		const data = await listStoresForApprovalConfig(event, hospitalId);
		return json(data);
	}
	const storeIdStr = event.url.searchParams.get('storeId');
	const moduleParam = event.url.searchParams.get('module');
	const module: InvApprovalModule | undefined =
		moduleParam == null || moduleParam === ''
			? undefined
			: isInvApprovalModule(moduleParam)
				? moduleParam
				: undefined;
	if (moduleParam != null && moduleParam !== '' && module === undefined) {
		return json({ error: 'Invalid module' }, { status: 400 });
	}
	if (!storeIdStr) {
		return json({ error: 'storeId required' }, { status: 400 });
	}
	const storeId = Number(storeIdStr);
	const data = await listApprovalLevelsForStore(event, {
		hospitalId,
		storeId,
		module
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const storeId = Number(body.storeId ?? 0);
	const moduleRaw = String(body.module ?? '');
	if (!isInvApprovalModule(moduleRaw)) {
		return json({ error: 'Invalid module' }, { status: 400 });
	}
	const module = moduleRaw;
	const id = body.id != null ? Number(body.id) : undefined;
	const assigneeStaffIds = Array.isArray(body.assigneeStaffIds)
		? (body.assigneeStaffIds as unknown[]).map((x) => String(x))
		: [];
	const isRequired =
		typeof body.isRequired === 'boolean' ? body.isRequired : true;
	const result = await upsertApprovalLevel(event, {
		hospitalId,
		storeId,
		module,
		isRequired,
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
