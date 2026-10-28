import {
	doctorBranches,
	doctorDisplayName,
	doctorHospitals,
	type DoctorPortalContext
} from './doctor-context.server';

export function buildDoctorProfile(
	ctx: DoctorPortalContext,
	options?: { mustChangePassword?: boolean }
) {
	const { staff } = ctx;
	const hospitals = doctorHospitals(staff);
	const activeHospital =
		hospitals.find((hospital) => hospital.id === ctx.hospitalId) ??
		hospitals[0] ??
		null;
	const branches = doctorBranches(staff, activeHospital?.id);

	return {
		userId: ctx.userId,
		staffId: ctx.staffId,
		doctorName: doctorDisplayName(staff),
		staffCode: staff.code ?? null,
		email: staff.user?.email ?? null,
		phonePrimary: staff.phonePrimary ?? null,
		title: staff.title?.name ?? null,
		specialization: staff.specialization?.name ?? null,
		designation: staff.position?.name ?? null,
		staffType: staff.staffType?.name ?? null,
		status: staff.status?.name ?? null,
		licenseNo: staff.staffDetail?.licenseNo ?? null,
		hospitalId: activeHospital?.id ?? ctx.hospitalId,
		hospitalName: activeHospital?.name ?? null,
		branchId: branches[0]?.id ?? null,
		branchName: branches[0]?.name ?? null,
		hospitals,
		branches,
		mustChangePassword: Boolean(options?.mustChangePassword)
	};
}
