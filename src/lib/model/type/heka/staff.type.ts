export type NamedLookup = {
	id: number;
	name: string | null;
};

export type AuthUser = {
	id: string;
	email?: string | null;
	name?: string | null;
};

export type StaffWithRelations = {
	id: string;
	code?: string | null;
	firstName?: string | null;
	middleName?: string | null;
	lastName?: string | null;
	identityNo?: string | null;
	phonePrimary?: string | null;
	phoneSecondary?: string | null;
	dateOfBirth?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;

	title?: NamedLookup | null;
	identityType?: NamedLookup | null;
	gender?: NamedLookup | null;
	maritalStatus?: NamedLookup | null;
	nationality?: NamedLookup | null;
	specialization?: NamedLookup | null;
	staffEmploymentType?: NamedLookup | null;
	staffType?: NamedLookup | null;
	status?: NamedLookup | null;

	/** Present on some API payloads (e.g. doctor pickers, print). */
	staffDetail?: {
		licenseNo?: string | null;
		signatureText?: string | null;
	} | null;

	user?: AuthUser | null;
};

/**
 * Staff row loaded in `hooks.server` for `event.locals.staff`.
 * Wider than API pickers; assign with `as StaffSessionRow` from DB query result.
 */
export type StaffSessionRow = StaffWithRelations & {
	userId: string;
	staffTypeId: number | null;
	staffHospitals?: { hospitalId: string }[];
};

/** Doctor row from appointment `doctor.list` (includes branch assignments). */
export type DoctorListStaffRow = StaffWithRelations & {
	staffBranches?: {
		branch: { id: string; name: string | null } | null;
	}[];
};

