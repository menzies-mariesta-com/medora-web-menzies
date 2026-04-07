/**
 * Master lookup rows used by patient registration (API JSON).
 * Mirrors Drizzle `master_table` select shapes without importing `$lib/server/**`.
 */
/** Matches Drizzle JSON rows where optional audit columns may be omitted. */
export type PatientRegMasterTimestamps = {
	createdAt: string;
	updatedAt: string;
	deletedAt?: string | null;
	createdBy?: string | null;
	updatedBy?: string | null;
	deletedBy?: string | null;
};

export type PatientRegTitleRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	statusId: number;
};

export type PatientRegGenderRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	statusId: number;
};

export type PatientRegMaritalStatusRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	statusId: number;
};

export type PatientRegIdentityTypeRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	statusId: number;
};

export type PatientRegBloodTypeRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	statusId: number;
};

export type PatientRegNationalityRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	statusId: number;
};

export type PatientRegReligionRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	statusId: number;
};

export type PatientRegCountryRow = PatientRegMasterTimestamps & {
	id: number;
	name: string;
	code: string;
	imageUrl: string;
	language: string;
	countryCallingCode: string;
	statusId: number;
};

export type PatientRegStateRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	code: string | null;
	countryId: number | null;
	statusId: number;
};

export type PatientRegCityRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	code: string | null;
	statusId: number;
	stateId: number | null;
};

export type PatientRegPostalCodeRow = PatientRegMasterTimestamps & {
	id: number;
	value: number;
	cityId: number;
	statusId: number;
};
