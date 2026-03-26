import type {
	InferInsertModel,
	InferSelectModel as DrizzleInferSelectModel,
	Table
} from 'drizzle-orm';
import type {
	hospitalBranchTable,
	hospitalDepartmentTable,
	hospitalPatientCodeCounterTable,
	hospitalTable,
	moduleTable,
	pageTable,
	staffDetailTable,
	staffDepartmentTable,
	staffHospitalTable,
	staffBranchTable,
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
	patientVisitTable,
	patientDiagnosisTable,
	diagnosisTable,
	patientFormEntryTable,
	appointmentBlockTable,
	subCategoryTable,
	serviceItemTable,
	serviceTaggingTable,
	storeTable,
	supportTicketTable,
	allergyTable,
	documentTypeTable,
	documentSettingTable,
	documentTable,
	patientDocumentTable,
	serviceOrderTable,
	serviceOrderDetailTable,
	referHistoryTable
} from './information-table';

type OptionalAuditKeys =
	| 'createdBy'
	| 'updatedBy'
	| 'deletedBy'
	| 'deletedAt';

type WithOptionalAudit<T> = Omit<
	T,
	Extract<keyof T, OptionalAuditKeys>
> &
	Partial<Pick<T, Extract<keyof T, OptionalAuditKeys>>>;

type InferSelectModel<TTable extends Table> = WithOptionalAudit<
	DrizzleInferSelectModel<TTable>
>;

// Information Tables (alphabetical)
export type HospitalBranchSchema = InferSelectModel<
	typeof hospitalBranchTable
>;
export type HospitalBranchSchemaInsert = InferInsertModel<
	typeof hospitalBranchTable
>;
export type HospitalBranchSchemaUpdate =
	Partial<HospitalBranchSchemaInsert>;

export type HospitalDepartmentSchema = InferSelectModel<
	typeof hospitalDepartmentTable
>;
export type HospitalDepartmentSchemaInsert = InferInsertModel<
	typeof hospitalDepartmentTable
>;
export type HospitalDepartmentSchemaUpdate =
	Partial<HospitalDepartmentSchemaInsert>;

export type HospitalSchema = InferSelectModel<typeof hospitalTable>;
export type HospitalSchemaInsert = InferInsertModel<
	typeof hospitalTable
>;
export type HospitalSchemaUpdate = Partial<HospitalSchemaInsert>;

export type HospitalPatientCodeCounterSchema = InferSelectModel<
	typeof hospitalPatientCodeCounterTable
>;
export type HospitalPatientCodeCounterSchemaInsert = InferInsertModel<
	typeof hospitalPatientCodeCounterTable
>;
export type HospitalPatientCodeCounterSchemaUpdate =
	Partial<HospitalPatientCodeCounterSchemaInsert>;

export type ModuleSchema = InferSelectModel<typeof moduleTable>;
export type ModuleSchemaInsert = InferInsertModel<typeof moduleTable>;
export type ModuleSchemaUpdate = Partial<ModuleSchemaInsert>;

export type PageSchema = InferSelectModel<typeof pageTable>;
export type PageSchemaInsert = InferInsertModel<typeof pageTable>;
export type PageSchemaUpdate = Partial<PageSchemaInsert>;

export type StaffDetailSchema = InferSelectModel<
	typeof staffDetailTable
>;
export type StaffDetailSchemaInsert = InferInsertModel<
	typeof staffDetailTable
>;
export type StaffDetailSchemaUpdate =
	Partial<StaffDetailSchemaInsert>;

export type StaffDepartmentSchema = InferSelectModel<
	typeof staffDepartmentTable
>;
export type StaffDepartmentSchemaInsert = InferInsertModel<
	typeof staffDepartmentTable
>;
export type StaffDepartmentSchemaUpdate =
	Partial<StaffDepartmentSchemaInsert>;

export type StaffHospitalSchema = InferSelectModel<
	typeof staffHospitalTable
>;
export type StaffHospitalSchemaInsert = InferInsertModel<
	typeof staffHospitalTable
>;
export type StaffHospitalSchemaUpdate =
	Partial<StaffHospitalSchemaInsert>;

export type StaffBranchSchema = InferSelectModel<
	typeof staffBranchTable
>;
export type StaffBranchSchemaInsert = InferInsertModel<
	typeof staffBranchTable
>;
export type StaffBranchSchemaUpdate =
	Partial<StaffBranchSchemaInsert>;

export type StaffSchema = InferSelectModel<typeof staffTable>;
export type StaffSchemaInsert = InferInsertModel<typeof staffTable>;
export type StaffSchemaUpdate = Partial<StaffSchemaInsert>;

export type StaffUserGroupSchema = InferSelectModel<
	typeof staffUserGroupTable
>;
export type StaffUserGroupSchemaInsert = InferInsertModel<
	typeof staffUserGroupTable
>;
export type StaffUserGroupSchemaUpdate =
	Partial<StaffUserGroupSchemaInsert>;

export type StatusTaggingSchema = InferSelectModel<
	typeof statusTaggingTable
>;
export type StatusTaggingSchemaInsert = InferInsertModel<
	typeof statusTaggingTable
>;
export type StatusTaggingSchemaUpdate =
	Partial<StatusTaggingSchemaInsert>;

export type StatusTaggingTypeSchema = InferSelectModel<
	typeof statusTaggingTypeTable
>;
export type StatusTaggingTypeSchemaInsert = InferInsertModel<
	typeof statusTaggingTypeTable
>;
export type StatusTaggingTypeSchemaUpdate =
	Partial<StatusTaggingTypeSchemaInsert>;

export type UserGroupPageSchema = InferSelectModel<
	typeof userGroupPageTable
>;
export type UserGroupPageSchemaInsert = InferInsertModel<
	typeof userGroupPageTable
>;
export type UserGroupPageSchemaUpdate =
	Partial<UserGroupPageSchemaInsert>;

export type UserGroupSchema = InferSelectModel<typeof userGroupTable>;
export type UserGroupSchemaInsert = InferInsertModel<
	typeof userGroupTable
>;
export type UserGroupSchemaUpdate = Partial<UserGroupSchemaInsert>;

export type PatientSchema = InferSelectModel<typeof patientTable>;
export type PatientSchemaInsert = InferInsertModel<
	typeof patientTable
>;
export type PatientSchemaUpdate = Partial<PatientSchemaInsert>;

export type PatientAttachmentSchema = InferSelectModel<
	typeof patientAttachmentTable
>;
export type PatientAttachmentSchemaInsert = InferInsertModel<
	typeof patientAttachmentTable
>;
export type PatientAttachmentSchemaUpdate =
	Partial<PatientAttachmentSchemaInsert>;

export type InsuranceSchema = InferSelectModel<typeof insuranceTable>;
export type InsuranceSchemaInsert = InferInsertModel<
	typeof insuranceTable
>;
export type InsuranceSchemaUpdate = Partial<InsuranceSchemaInsert>;

export type PatientInsuranceSchema = InferSelectModel<
	typeof patientInsurance
>;
export type PatientInsuranceSchemaInsert = InferInsertModel<
	typeof patientInsurance
>;
export type PatientInsuranceSchemaUpdate =
	Partial<PatientInsuranceSchemaInsert>;

export type PatientAllergiesSchema = InferSelectModel<
	typeof patientAllergyTable
>;
export type PatientAllergiesSchemaInsert = InferInsertModel<
	typeof patientAllergyTable
>;
export type PatientAllergiesSchemaUpdate =
	Partial<PatientAllergiesSchemaInsert>;

export type DoctorScheduleSchema = InferSelectModel<
	typeof doctorScheduleTable
>;
export type DoctorScheduleSchemaInsert = InferInsertModel<
	typeof doctorScheduleTable
>;
export type DoctorScheduleSchemaUpdate =
	Partial<DoctorScheduleSchemaInsert>;

export type ExternalReferSchema = InferSelectModel<
	typeof externalReferTable
>;
export type ExternalReferSchemaInsert = InferInsertModel<
	typeof externalReferTable
>;
export type ExternalReferSchemaUpdate =
	Partial<ExternalReferSchemaInsert>;

export type AppointmentSchema = InferSelectModel<
	typeof appointmentTable
>;
export type AppointmentSchemaInsert = InferInsertModel<
	typeof appointmentTable
>;
export type AppointmentSchemaUpdate =
	Partial<AppointmentSchemaInsert>;

export type AppointmentBlockSchema = InferSelectModel<
	typeof appointmentBlockTable
>;
export type AppointmentBlockSchemaInsert = InferInsertModel<
	typeof appointmentBlockTable
>;
export type AppointmentBlockSchemaUpdate =
	Partial<AppointmentBlockSchemaInsert>;

export type PatientVisitSchema = InferSelectModel<
	typeof patientVisitTable
>;
export type PatientVisitSchemaInsert = InferInsertModel<
	typeof patientVisitTable
>;
export type PatientVisitSchemaUpdate =
	Partial<PatientVisitSchemaInsert>;

export type PatientDiagnosisSchema = InferSelectModel<
	typeof patientDiagnosisTable
>;
export type PatientDiagnosisSchemaInsert = InferInsertModel<
	typeof patientDiagnosisTable
>;
export type PatientDiagnosisSchemaUpdate =
	Partial<PatientDiagnosisSchemaInsert>;

export type DiagnosisSchema = InferSelectModel<typeof diagnosisTable>;
export type DiagnosisSchemaInsert = InferInsertModel<
	typeof diagnosisTable
>;
export type DiagnosisSchemaUpdate = Partial<DiagnosisSchemaInsert>;

export type PatientFormEntrySchema = InferSelectModel<
	typeof patientFormEntryTable
>;
export type PatientFormEntrySchemaInsert = InferInsertModel<
	typeof patientFormEntryTable
>;
export type PatientFormEntrySchemaUpdate =
	Partial<PatientFormEntrySchemaInsert>;

export type SubCategorySchema = InferSelectModel<
	typeof subCategoryTable
>;
export type SubCategorySchemaInsert = InferInsertModel<
	typeof subCategoryTable
>;
export type SubCategorySchemaUpdate =
	Partial<SubCategorySchemaInsert>;

export type ServiceItemSchema = InferSelectModel<
	typeof serviceItemTable
>;
export type ServiceItemSchemaInsert = InferInsertModel<
	typeof serviceItemTable
>;
export type ServiceItemSchemaUpdate =
	Partial<ServiceItemSchemaInsert>;

export type ServiceTaggingSchema = InferSelectModel<
	typeof serviceTaggingTable
>;
export type ServiceTaggingSchemaInsert = InferInsertModel<
	typeof serviceTaggingTable
>;
export type ServiceTaggingSchemaUpdate =
	Partial<ServiceTaggingSchemaInsert>;

export type StoreSchema = InferSelectModel<typeof storeTable>;
export type StoreSchemaInsert = InferInsertModel<typeof storeTable>;
export type StoreSchemaUpdate = Partial<StoreSchemaInsert>;

export type SupportTicketSchema = InferSelectModel<
	typeof supportTicketTable
>;
export type SupportTicketSchemaInsert = InferInsertModel<
	typeof supportTicketTable
>;
export type SupportTicketSchemaUpdate =
	Partial<SupportTicketSchemaInsert>;

export type AllergySchema = InferSelectModel<typeof allergyTable>;
export type AllergySchemaInsert = InferInsertModel<
	typeof allergyTable
>;
export type AllergySchemaUpdate = Partial<AllergySchemaInsert>;

export type DocumentTypeSchema = InferSelectModel<
	typeof documentTypeTable
>;
export type DocumentTypeSchemaInsert = InferInsertModel<
	typeof documentTypeTable
>;
export type DocumentTypeSchemaUpdate =
	Partial<DocumentTypeSchemaInsert>;

export type DocumentSchema = InferSelectModel<typeof documentTable>;
export type DocumentSchemaInsert = InferInsertModel<
	typeof documentTable
>;
export type DocumentSchemaUpdate = Partial<DocumentSchemaInsert>;

export type PatientDocumentSchema = InferSelectModel<
	typeof patientDocumentTable
>;
export type PatientDocumentSchemaInsert = InferInsertModel<
	typeof patientDocumentTable
>;
export type PatientDocumentSchemaUpdate =
	Partial<PatientDocumentSchemaInsert>;

export type ServiceOrderSchema = InferSelectModel<
	typeof serviceOrderTable
>;
export type ServiceOrderSchemaInsert = InferInsertModel<
	typeof serviceOrderTable
>;
export type ServiceOrderSchemaUpdate =
	Partial<ServiceOrderSchemaInsert>;

export type ServiceOrderDetailSchema = InferSelectModel<
	typeof serviceOrderDetailTable
>;
export type ServiceOrderDetailSchemaInsert = InferInsertModel<
	typeof serviceOrderDetailTable
>;
export type ServiceOrderDetailSchemaUpdate =
	Partial<ServiceOrderDetailSchemaInsert>;

export type DocumentSettingSchema = InferSelectModel<
	typeof documentSettingTable
>;
export type DocumentSettingSchemaInsert = InferInsertModel<
	typeof documentSettingTable
>;
export type DocumentSettingSchemaUpdate =
	Partial<DocumentSettingSchemaInsert>;

export type ReferHistorySchema = InferSelectModel<
	typeof referHistoryTable
>;
export type ReferHistorySchemaInsert = InferInsertModel<
	typeof referHistoryTable
>;
export type ReferHistorySchemaUpdate =
	Partial<ReferHistorySchemaInsert>;
