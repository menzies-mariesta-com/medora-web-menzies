/**
 * Lookup / list row types for staff registration UI (API JSON).
 * Reuses patient registration master rows where shapes match; adds hospital-scoped rows.
 */
import type { PatientRegMasterTimestamps } from './patient-reg-master.type';

export type {
	PatientRegBloodTypeRow,
	PatientRegCityRow,
	PatientRegCountryRow,
	PatientRegGenderRow,
	PatientRegIdentityTypeRow,
	PatientRegMaritalStatusRow,
	PatientRegNationalityRow,
	PatientRegPostalCodeRow,
	PatientRegStateRow,
	PatientRegTitleRow
} from './patient-reg-master.type';

export type StaffRegHospitalBranchRow = PatientRegMasterTimestamps & {
	id: string;
	hospitalId: string;
	name: string | null;
	code: string | null;
	address: string | null;
	phone: string | null;
	phoneCountryId: number | null;
	email: string | null;
	postalCodeId: number | null;
	cityId: number | null;
	stateId: number | null;
	countryId: number | null;
	statusId: number;
};

export type StaffRegUserGroupRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	statusId: number;
	hospitalId: string | null;
};

export type StaffRegDepartmentRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	code: string | null;
	statusId: number;
};

export type StaffRegStaffTypeRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	code: string | null;
	statusId: number;
};

export type StaffRegStaffEmploymentTypeRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	code: string | null;
	statusId: number;
};
