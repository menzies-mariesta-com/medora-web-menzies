import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hekaHospitalHome } from '$lib/model/enum/routes.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { RoleEnum } from '$lib/model/enum/db-link';
import { and, eq } from 'drizzle-orm';

const COOKIE_SELECTED_BRANCH_ID = 'heka_selected_branch_id';
const BRANCH_ALL_VALUE = '__all__';

/** POST with form body branchId=uuid. Sets cookie and redirects to referrer or hospital home. */
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
	const raw = formData.get('branchId');
	const branchId = typeof raw === 'string' ? raw.trim() : '';
	if (!branchId) {
		throw redirect(303, hekaHospitalHome(hospitalId));
	}

	if (branchId === BRANCH_ALL_VALUE) {
		// "All Branches" is only valid when staff is assigned to every branch in this hospital.
		const [allHospitalBranches, staffBranchesInHospital] =
			await Promise.all([
				ensureDb()
					.select({ id: table.hospitalBranchTable.id })
					.from(table.hospitalBranchTable)
					.where(
						eq(table.hospitalBranchTable.hospitalId, hospitalId)
					),
				ensureDb()
					.select({ branchId: table.staffBranchTable.branchId })
					.from(table.staffBranchTable)
					.innerJoin(
						table.hospitalBranchTable,
						eq(
							table.staffBranchTable.branchId,
							table.hospitalBranchTable.id
						)
					)
					.where(
						and(
							eq(table.staffBranchTable.staffId, staffId),
							eq(table.hospitalBranchTable.hospitalId, hospitalId)
						)
					)
			]);
		const allIds = allHospitalBranches.map((b) => b.id);
		const staffSet = new Set(
			staffBranchesInHospital.map((b) => b.branchId)
		);
		const hasAllBranchesAccess =
			allIds.length > 0 && allIds.every((id) => staffSet.has(id));
		if (!hasAllBranchesAccess) {
			throw redirect(303, hekaHospitalHome(hospitalId));
		}
		cookies.set(COOKIE_SELECTED_BRANCH_ID, BRANCH_ALL_VALUE, {
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
	}

	// Ensure branch belongs to this hospital and staff is assigned to that branch
	const row = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.staffBranchTable)
		.innerJoin(
			table.hospitalBranchTable,
			eq(
				table.staffBranchTable.branchId,
				table.hospitalBranchTable.id
			)
		)
		.where(
			and(
				eq(table.staffBranchTable.staffId, staffId),
				eq(table.staffBranchTable.branchId, branchId),
				eq(table.hospitalBranchTable.hospitalId, hospitalId)
			)
		)
		.limit(1)
		.then((rows) => rows[0]);

	if (!row) {
		throw redirect(303, hekaHospitalHome(hospitalId));
	}

	cookies.set(COOKIE_SELECTED_BRANCH_ID, branchId, {
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
