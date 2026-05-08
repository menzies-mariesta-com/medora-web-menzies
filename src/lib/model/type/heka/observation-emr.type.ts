/**
 * API/JSON shapes for the EMR observation `+page` ↔
 * `../api/.../observation/emr` contract (not Drizzle row types).
 */

/** `visit.get` — fields used by the observation EMR page. */
export type ObservationEmrPatientVisitRow = {
	id: number;
	patientId: string;
	hospitalId: string;
	branchId: string;
	clinicalSignedAt?: string | null;
};

export type ObservationEmrPatientAllergyRow = {
	id: number;
	visitId: number;
	statusId: number | null;
	reaction: string | null;
	remark: string | null;
	deactivationRemark: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
	severity?: { name: string | null } | null;
	allergy?: { name: string | null } | null;
	visit?: { hospitalId: string; visitNo: string | null } | null;
};

export type ObservationEmrDiagnosisRow = {
	id: number;
	statusId: number | null;
	description: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
	diagnosisType?: { name: string | null } | null;
};

export type ObservationEmrFormEntryRow = {
	id: number;
	branchId: string;
	patientId: string;
	visitId: number;
	statusId: number | null;
	description: string | null;
	createdAt?: string | null;
	formName?: { code: string | null } | null;
	visit?: { visitNo: string | null; createdAt?: string | null } | null;
};
