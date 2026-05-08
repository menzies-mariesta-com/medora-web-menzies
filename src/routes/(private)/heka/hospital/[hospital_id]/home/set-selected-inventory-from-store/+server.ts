import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hekaHospitalHome } from '$lib/model/enum/routes.enum';
import { listStoresForApprovalConfig } from '$lib/server/heka/inventory/approval-config.server';
import { RoleEnum } from '$lib/model/enum/db-link';

const COOKIE_SELECTED_INVENTORY_FROM_STORE_ID =
	'heka_selected_inventory_from_store_id';
const COOKIE_SELECTED_USER_GROUP_ID = 'heka_selected_user_group_id';

/** POST with form body storeId=number. Sets cookie and redirects to referrer or hospital home. */
export const POST: RequestHandler = async (event) => {
	const { request, params, cookies } = event;
	const hospitalId = params.hospital_id ?? '';
	const formData = await request.formData();
	const raw = formData.get('storeId');
	const storeIdStr = typeof raw === 'string' ? raw.trim() : '';
	if (!storeIdStr || !Number.isFinite(Number(storeIdStr))) {
		throw redirect(303, hekaHospitalHome(hospitalId));
	}
	const storeId = Number(storeIdStr);

	const userRoleId = event.locals.userRoleId ?? null;
	const selectedUserGroupId =
		userRoleId === RoleEnum.STAFF
			? (() => {
					const raw = cookies.get(COOKIE_SELECTED_USER_GROUP_ID);
					const n = raw != null ? Number(raw) : NaN;
					return Number.isInteger(n) && n > 0 ? n : null;
				})()
			: null;

	const stores = await listStoresForApprovalConfig(event, hospitalId, {
		userGroupId: selectedUserGroupId
	});
	if (!stores.some((s) => s.id === storeId)) {
		throw redirect(303, hekaHospitalHome(hospitalId));
	}

	cookies.set(COOKIE_SELECTED_INVENTORY_FROM_STORE_ID, String(storeId), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});

	const referer = request.headers.get('referer');
	const redirectUrl =
		referer &&
		new URL(referer).pathname.startsWith(`/heka/hospital/${hospitalId}/home`)
			? referer
			: hekaHospitalHome(hospitalId);
	throw redirect(303, redirectUrl);
};
