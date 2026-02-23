import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
	hospitalDepartmentTable,
	hospitalPatientCodeCounterTable,
	hospitalTable,
	moduleTable,
	pageTable,
	staffDetailTable,
	staffDepartmentTable,
	staffHospitalTable,
	staffTable,
	staffUserGroupTable,
	statusTaggingTable,
	statusTaggingTypeTable,
	userGroupPageTable,
	userGroupTable,
	patientAttachmentTable,
	insuranceTable,
	patientInsurance,
	patientAllergyTable,
	appointmentTable,
	doctorScheduleTable,
	externalReferTable,
	patientTable,
	appointmentBlockTable,
} from './information-table';

// Information Tables (alphabetical)
export type HospitalDepartmentSchema = InferSelectModel<typeof hospitalDepartmentTable>;
export type HospitalDepartmentSchemaInsert = InferInsertModel<typeof hospitalDepartmentTable>;
export type HospitalDepartmentSchemaUpdate = Partial<HospitalDepartmentSchemaInsert>;

export type HospitalSchema = InferSelectModel<typeof hospitalTable>;
export type HospitalSchemaInsert = InferInsertModel<typeof hospitalTable>;
export type HospitalSchemaUpdate = Partial<HospitalSchemaInsert>;

export type HospitalPatientCodeCounterSchema = InferSelectModel<
	typeof hospitalPatientCodeCounterTable
>;
export type HospitalPatientCodeCounterSchemaInsert = InferInsertModel<
	typeof hospitalPatientCodeCounterTable
>;
export type HospitalPatientCodeCounterSchemaUpdate = Partial<
	HospitalPatientCodeCounterSchemaInsert
>;

export type ModuleSchema = InferSelectModel<typeof moduleTable>;
export type ModuleSchemaInsert = InferInsertModel<typeof moduleTable>;
export type ModuleSchemaUpdate = Partial<ModuleSchemaInsert>;

export type PageSchema = InferSelectModel<typeof pageTable>;
export type PageSchemaInsert = InferInsertModel<typeof pageTable>;
export type PageSchemaUpdate = Partial<PageSchemaInsert>;

export type StaffDetailSchema = InferSelectModel<typeof staffDetailTable>;
export type StaffDetailSchemaInsert = InferInsertModel<typeof staffDetailTable>;
export type StaffDetailSchemaUpdate = Partial<StaffDetailSchemaInsert>;

export type StaffDepartmentSchema = InferSelectModel<typeof staffDepartmentTable>;
export type StaffDepartmentSchemaInsert = InferInsertModel<typeof staffDepartmentTable>;
export type StaffDepartmentSchemaUpdate = Partial<StaffDepartmentSchemaInsert>;

export type StaffHospitalSchema = InferSelectModel<typeof staffHospitalTable>;
export type StaffHospitalSchemaInsert = InferInsertModel<typeof staffHospitalTable>;
export type StaffHospitalSchemaUpdate = Partial<StaffHospitalSchemaInsert>;

export type StaffSchema = InferSelectModel<typeof staffTable>;
export type StaffSchemaInsert = InferInsertModel<typeof staffTable>;
export type StaffSchemaUpdate = Partial<StaffSchemaInsert>;

export type StaffUserGroupSchema = InferSelectModel<typeof staffUserGroupTable>;
export type StaffUserGroupSchemaInsert = InferInsertModel<typeof staffUserGroupTable>;
export type StaffUserGroupSchemaUpdate = Partial<StaffUserGroupSchemaInsert>;

export type StatusTaggingSchema = InferSelectModel<typeof statusTaggingTable>;
export type StatusTaggingSchemaInsert = InferInsertModel<typeof statusTaggingTable>;
export type StatusTaggingSchemaUpdate = Partial<StatusTaggingSchemaInsert>;

export type StatusTaggingTypeSchema = InferSelectModel<typeof statusTaggingTypeTable>;
export type StatusTaggingTypeSchemaInsert = InferInsertModel<typeof statusTaggingTypeTable>;
export type StatusTaggingTypeSchemaUpdate = Partial<StatusTaggingTypeSchemaInsert>;

export type UserGroupPageSchema = InferSelectModel<typeof userGroupPageTable>;
export type UserGroupPageSchemaInsert = InferInsertModel<typeof userGroupPageTable>;
export type UserGroupPageSchemaUpdate = Partial<UserGroupPageSchemaInsert>;

export type UserGroupSchema = InferSelectModel<typeof userGroupTable>;
export type UserGroupSchemaInsert = InferInsertModel<typeof userGroupTable>;
export type UserGroupSchemaUpdate = Partial<UserGroupSchemaInsert>;

export type PatientSchema = InferSelectModel<typeof patientTable>;
export type PatientSchemaInsert = InferInsertModel<typeof patientTable>;
export type PatientSchemaUpdate = Partial<PatientSchemaInsert>;

export type PatientAttachmentSchema = InferSelectModel<typeof patientAttachmentTable>;
export type PatientAttachmentSchemaInsert = InferInsertModel<typeof patientAttachmentTable>;
export type PatientAttachmentSchemaUpdate = Partial<PatientAttachmentSchemaInsert>;

export type InsuranceSchema = InferSelectModel<typeof insuranceTable>;
export type InsuranceSchemaInsert = InferInsertModel<typeof insuranceTable>;
export type InsuranceSchemaUpdate = Partial<InsuranceSchemaInsert>;

export type PatientInsuranceSchema = InferSelectModel<typeof patientInsurance>;
export type PatientInsuranceSchemaInsert = InferInsertModel<typeof patientInsurance>;
export type PatientInsuranceSchemaUpdate = Partial<PatientInsuranceSchemaInsert>;

export type PatientAllergiesSchema = InferSelectModel<typeof patientAllergyTable>;
export type PatientAllergiesSchemaInsert = InferInsertModel<typeof patientAllergyTable>;
export type PatientAllergiesSchemaUpdate = Partial<PatientAllergiesSchemaInsert>;

export type DoctorScheduleSchema = InferSelectModel<typeof doctorScheduleTable>;
export type DoctorScheduleSchemaInsert = InferInsertModel<typeof doctorScheduleTable>;
export type DoctorScheduleSchemaUpdate = Partial<DoctorScheduleSchemaInsert>;

export type ExternalReferSchema = InferSelectModel<typeof externalReferTable>;
export type ExternalReferSchemaInsert = InferInsertModel<typeof externalReferTable>;
export type ExternalReferSchemaUpdate = Partial<ExternalReferSchemaInsert>;

export type AppointmentSchema = InferSelectModel<typeof appointmentTable>;
export type AppointmentSchemaInsert = InferInsertModel<typeof appointmentTable>;
export type AppointmentSchemaUpdate = Partial<AppointmentSchemaInsert>;

export type AppointmentBlockSchema = InferSelectModel<typeof appointmentBlockTable>;
export type AppointmentBlockSchemaInsert = InferInsertModel<typeof appointmentBlockTable>;
export type AppointmentBlockSchemaUpdate = Partial<AppointmentBlockSchemaInsert>;