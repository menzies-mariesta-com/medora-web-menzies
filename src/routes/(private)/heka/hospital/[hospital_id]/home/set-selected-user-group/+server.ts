import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hekaHospitalHome } from '$lib/model/enum/routes.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { RoleEnum } from '$lib/model/enum/db-link';
import { and, eq } from 'drizzle-orm';

const COOKIE_SELECTED_USER_GROUP_ID = 'heka_selected_user_group_id';

/** POST with form body userGroupId= number. Sets cookie and redirects to referrer or hospital home. */
export const POST: RequestHandler = async ({
	request,
	params,
	cookies,
	locals
}) => {
	const userRoleId = locals.userRoleId ?? null;
	const staffId = locals.staff?.id ?? null;
	const hospitalId = params.hospital_id ?? '';
	if (userRoleId !== RoleEnum.STAFF || !staffId) {
		throw redirect(303, hekaHospitalHome(hospitalId));
	}

	const formData = await request.formData();
	const raw = formData.get('userGroupId');
	const userGroupId = raw != null && raw !== '' ? Number(raw) : NaN;
	if (!Number.isInteger(userGroupId) || userGroupId < 1) {
		throw redirect(303, hekaHospitalHome(hospitalId));
	}

	// Ensure staff belongs to this user group and group belongs to this hospital
	const row = await ensureDb()
		.select({ id: table.userGroupTable.id })
		.from(table.staffUserGroupTable)
		.innerJoin(
			table.userGroupTable,
			eq(
				table.staffUserGroupTable.userGroupId,
				table.userGroupTable.id
			)
		)
		.where(
			and(
				eq(table.staffUserGroupTable.staffId, staffId),
				eq(table.staffUserGroupTable.userGroupId, userGroupId),
				eq(table.userGroupTable.hospitalId, hospitalId)
			)
		)
		.limit(1)
		.then((rows) => rows[0]);

	if (!row) {
		throw redirect(303, hekaHospitalHome(hospitalId));
	}

	cookies.set(COOKIE_SELECTED_USER_GROUP_ID, String(userGroupId), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});

	const referer = request.headers.get('referer');
	const redirectUrl =
		referer &&
		new URL(referer).pathname.startsWith(
			`/heka/hospital/${hospitalId}/home`
		)
			? referer
			: hekaHospitalHome(hospitalId);
	throw redirect(303, redirectUrl);
};
