import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
	hekaHospitalHome,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';
import { RoleEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, params, url }) => {
	const hospitalId = params.hospital_id;
	if (!locals.user) {
		const redirectTo = `${url.pathname}${url.search}`;
		throw redirect(
			302,
			`${WebRoutesEnum.LOGIN}?redirectTo=${encodeURIComponent(redirectTo)}`
		);
	}

	// Staff may only access their assigned hospitals
	if (
		locals.userRoleId === RoleEnum.STAFF &&
		locals.allowedHospitalIds?.length
	) {
		const allowed = new Set(locals.allowedHospitalIds);
		if (hospitalId && !allowed.has(hospitalId)) {
			throw redirect(
				302,
				hekaHospitalHome(locals.allowedHospitalIds[0])
			);
		}
		return {};
	}

	// Owner may only access hospitals they own
	if (locals.userRoleId === RoleEnum.OWNER && hospitalId) {
		const [hospital] = await ensureDb()
			.select({ ownerId: table.hospitalTable.ownerId })
			.from(table.hospitalTable)
			.where(eq(table.hospitalTable.id, hospitalId))
			.limit(1);
		if (!hospital || hospital.ownerId !== locals.user.id) {
			throw redirect(302, WebRoutesEnum.HEKA_HOSPITAL);
		}
	}

	return {};
};
