/** SYSTEM_ADMIN staff list row (HTTP contract). */

export type AdminStaffHospitalRef = {
	id: string;
	name: string | null;
};

export type AdminStaffListRow = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	createdAt: string;
	updatedAt: string;
	/** From staff profile when present; otherwise null. */
	statusId: number | null;
	hospitals: AdminStaffHospitalRef[];
};
