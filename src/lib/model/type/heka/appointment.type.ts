import type { PatientRegMasterTimestamps } from './patient-reg-master.type';
import type { PatientWithRelations } from './patient.type';
import type { StaffWithRelations } from './staff.type';

type NamedLookup = {
	id: number;
	name: string | null;
	code?: string | null;
};

/** Appointment list/detail row with relations (API JSON). */
export type AppointmentWithRelations = PatientRegMasterTimestamps & {
	id: number;
	hospitalId: string;
	branchId: string;
	patientId: string | null;
	staffId: string | null;
	appointmentDate: string | null;
	fromTime: string | null;
	toTime: string | null;
	patientTitleId: number | null;
	patientName: string | null;
	patientDateOfBirth: string | null;
	patientAgeYear: number | null;
	patientAgeMonth: number | null;
	patientAgeDay: number | null;
	appointmentPhone: string | null;
	appointmentEmail: string | null;
	referTypeId: number | null;
	externalReferId: number | null;
	statusTaggingId: number | null;
	remark: string | null;
	cancelRemark: string | null;
	statusId: number;
	hospital?: { id: string; name?: string | null } | null;
	branch?: { id: string; name?: string | null; code?: string | null } | null;
	patient?: PatientWithRelations | null;
	staff?: StaffWithRelations | null;
	patientTitle?: NamedLookup | null;
	referType?: NamedLookup | null;
	externalRefer?: { id: number; name?: string | null } | null;
	statusTagging?: NamedLookup | null;
	status?: NamedLookup | null;
};

/** Body for `appointment.create` (form → API). */
export type AppointmentCreatePayload = {
	hospitalId: string;
	branchId: string;
	appointmentDate: string;
	fromTime: string;
	toTime: string;
	patientId: string | null;
	staffId: string | null;
	patientTitleId: number | null;
	patientName: string | null;
	patientDateOfBirth: string | null;
	patientAgeYear: number | null;
	patientAgeMonth: number | null;
	patientAgeDay: number | null;
	appointmentPhone: string | null;
	appointmentEmail: string | null;
	referTypeId: number | null;
	externalReferId: number | null;
	statusTaggingId: number | null;
	remark: string | null;
};

/** Body for `appointment.update` (form → API). */
export type AppointmentUpdatePayload = {
	id: number;
	appointmentDate: string;
	fromTime: string;
	toTime: string;
	patientId: string | null;
	patientTitleId: number | null;
	patientName: string | null;
	patientDateOfBirth: string | null;
	patientAgeYear: number | null;
	patientAgeMonth: number | null;
	patientAgeDay: number | null;
	appointmentPhone: string | null;
	appointmentEmail: string | null;
	referTypeId: number | null;
	externalReferId: number | null;
	statusTaggingId: number | null;
	remark: string | null;
	cancelRemark: string | null;
};
