import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AdminPageKeyEnum } from '$lib/model/enum/db-link';
import { requireAdminPagePermission } from '$lib/server/medora/admin/admin-permission.server';
import {
	listActiveOwnerPlans,
	listPendingPlanRequests
} from '$lib/server/medora/plan/owner-entitlement.server';

export const GET: RequestHandler = async (event) => {
	await requireAdminPagePermission(event, AdminPageKeyEnum.PLANS, 'view');
	const [pending, active] = await Promise.all([
		listPendingPlanRequests(),
		listActiveOwnerPlans()
	]);
	return json({ pending, active });
};
