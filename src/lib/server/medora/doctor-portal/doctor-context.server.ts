import { error, type RequestEvent } from '@sveltejs/kit';
import {
	RoleEnum,
	StaffTypeEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type { StaffSessionRow } from '$lib/model/type/medora/staff.type';

export const DOCTOR_STAFF_TYPE_IDS = new Set<number>([
	StaffTypeEnum.DOCTOR,
	StaffTypeEnum.MEDICAL_OFFICER,
	StaffTypeEnum.CONSULTANT
]);

export type DoctorStaffRow = StaffSessionRow & {
	statusId?: number | null;
	position?: { name: string | null } | null;
	staffHospitals?: {
		hospitalId: string;
		hospital?: { id: string; name: string | null } | null;
	}[];
	staffBranches?: {
		branch?: {
			id: string;
			name: string | null;
			hospitalId?: string | null;
		} | null;
	}[];
};

export type DoctorPortalContext = {
	userId: string;
	staff: DoctorStaffRow;
	staffId: string;
	hospitalId: string;
	branchId: string | null;
};

export function isDoctorStaff(
	staff: unknown
): staff is DoctorStaffRow {
	if (!staff || typeof staff !== 'object') return false;
	const row = staff as DoctorStaffRow;
	return (
		typeof row.id === 'string' &&
		typeof row.staffTypeId === 'number' &&
		DOCTOR_STAFF_TYPE_IDS.has(row.staffTypeId)
	);
}

export function doctorDisplayName(
	staff:
		| {
				firstName?: string | null;
				middleName?: string | null;
				lastName?: string | null;
				title?: { name?: string | null } | null;
		  }
		| null
		| undefined
): string | null {
	if (!staff) return null;
	const parts = [
		staff.title?.name,
		staff.firstName,
		staff.middleName,
		staff.lastName
	]
		.map((value) => value?.trim())
		.filter(Boolean);
	const name = parts.join(' ').trim();
	return name || null;
}

export function doctorHospitals(staff: DoctorStaffRow) {
	return (staff.staffHospitals ?? [])
		.map((row) => ({
			id: row.hospitalId,
			name: row.hospital?.name ?? null
		}))
		.filter((row) => Boolean(row.id));
}

export function doctorBranches(
	staff: DoctorStaffRow,
	hospitalId?: string
) {
	return (staff.staffBranches ?? [])
		.map((row) => row.branch)
		.filter(
			(
				branch
			): branch is {
				id: string;
				name: string | null;
				hospitalId?: string | null;
			} =>
				Boolean(branch?.id) &&
				(!hospitalId || branch.hospitalId === hospitalId)
		)
		.map((branch) => ({ id: branch.id, name: branch.name }));
}

/**
 * Resolve the signed-in doctor and the hospital/branch scope for a request.
 *
 * The web app uses the same Better Auth session. Mobile sends the session token
 * as `Authorization: Bearer …`, which the bearer plugin turns into the same
 * `event.locals.user` / `event.locals.staff` values.
 */
export function requireDoctorContext(
	event: RequestEvent,
	options?: { allowBeforePasswordChange?: boolean }
): DoctorPortalContext {
	if (!event.locals.user?.id) {
		throw error(401, 'Authentication required');
	}
	if (event.locals.userRoleId !== RoleEnum.STAFF) {
		throw error(403, 'Staff account required');
	}
	if (
		event.locals.mustChangePassword &&
		!options?.allowBeforePasswordChange
	) {
		throw error(403, 'Password change required');
	}
	const staff = event.locals.staff as DoctorStaffRow | null;
	if (!staff?.id) {
		throw error(403, 'No staff profile is linked to this account');
	}
	if (!isDoctorStaff(staff)) {
		throw error(403, 'Doctor account required');
	}
	if (
		typeof staff.statusId === 'number' &&
		staff.statusId !== StatusEnum.ACTIVE
	) {
		throw error(403, 'This doctor account is not active');
	}

	const hospitals = doctorHospitals(staff);
	if (hospitals.length === 0) {
		throw error(403, 'No hospital is assigned to this doctor');
	}
	const requestedHospitalId = event.url.searchParams
		.get('hospitalId')
		?.trim();
	const hospitalId = requestedHospitalId || hospitals[0].id;
	if (!hospitals.some((hospital) => hospital.id === hospitalId)) {
		throw error(403, 'You do not have access to this hospital');
	}

	const requestedBranchId = event.url.searchParams
		.get('branchId')
		?.trim();
	if (requestedBranchId) {
		const branches = doctorBranches(staff, hospitalId);
		if (!branches.some((branch) => branch.id === requestedBranchId)) {
			throw error(403, 'You do not have access to this branch');
		}
	}

	return {
		userId: event.locals.user.id,
		staff,
		staffId: staff.id,
		hospitalId,
		branchId: requestedBranchId || null
	};
}

export function getRequestedHospitalId(
	event: RequestEvent,
	staff: DoctorStaffRow
): string {
	const requested = event.url.searchParams.get('hospitalId')?.trim();
	if (requested) return requested;
	return doctorHospitals(staff)[0]?.id ?? '';
}
