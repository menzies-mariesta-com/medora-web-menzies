import { pgTable, foreignKey, serial, uuid, varchar, text, integer, timestamp, pgSequence } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const roleIdSeq = pgSequence("role_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const bloodTypeIdSeq = pgSequence("blood_type_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const cityIdSeq = pgSequence("city_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const countryIdSeq = pgSequence("country_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const craftGroupIdSeq = pgSequence("craft_group_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const departmentIdSeq = pgSequence("department_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const genderIdSeq = pgSequence("gender_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const identityTypeIdSeq = pgSequence("identity_type_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const maritalStatusIdSeq = pgSequence("marital_status_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const nationalityIdSeq = pgSequence("nationality_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const positionIdSeq = pgSequence("position_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const postalCodeIdSeq = pgSequence("postal_code_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const referTypeIdSeq = pgSequence("refer_type_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const religionIdSeq = pgSequence("religion_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const specializationIdSeq = pgSequence("specialization_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const staffEmploymentTypeIdSeq = pgSequence("staff_employment_type_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const staffShiftTypeIdSeq = pgSequence("staff_shift_type_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const staffTypeIdSeq = pgSequence("staff_type_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const stateIdSeq = pgSequence("state_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const statusIdSeq = pgSequence("status_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const titleIdSeq = pgSequence("title_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const weekdayIdSeq = pgSequence("weekday_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const appointmentBlockIdSeq = pgSequence("appointment_block_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const appointmentIdSeq = pgSequence("appointment_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const doctorScheduleIdSeq = pgSequence("doctor_schedule_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const doctorScheduleWeekdayIdSeq = pgSequence("doctor_schedule_weekday_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const externalReferIdSeq = pgSequence("external_refer_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const hospitalDepartmentIdSeq = pgSequence("hospital_department_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const moduleIdSeq = pgSequence("module_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const pageIdSeq = pgSequence("page_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const patientAttachmentIdSeq = pgSequence("patient_attachment_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const patientInsuranceIdSeq = pgSequence("patient_insurance_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const staffDepartmentIdSeq = pgSequence("staff_department_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const staffDetailIdSeq = pgSequence("staff_detail_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const staffHospitalIdSeq = pgSequence("staff_hospital_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const staffUserGroupIdSeq = pgSequence("staff_user_group_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const statusTaggingIdSeq = pgSequence("status_tagging_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const statusTaggingTypeIdSeq = pgSequence("status_tagging_type_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const userGroupPageIdSeq = pgSequence("user_group_page_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const userGroupIdSeq = pgSequence("user_group_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const unitIdSeq = pgSequence("unit_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const unitTypeIdSeq = pgSequence("unit_type_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const visitTypeIdSeq = pgSequence("visit_type_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const patientDiagnosisIdSeq = pgSequence("patient_diagnosis_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const patientVisitIdSeq = pgSequence("patient_visit_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const staffBranchIdSeq = pgSequence("staff_branch_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const patientAllergyIdSeq = pgSequence("patient_allergy_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const storeIdSeq = pgSequence("store_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const allergyIdSeq = pgSequence("allergy_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const patientDocumentIdSeq = pgSequence("patient_document_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const severityIdSeq = pgSequence("severity_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const documentTypeIdSeq = pgSequence("document_type_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const documentIdSeq = pgSequence("document_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const categoryIdSeq = pgSequence("category_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const serviceItemIdSeq = pgSequence("service_item_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const serviceTaggingIdSeq = pgSequence("service_tagging_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const subCategoryIdSeq = pgSequence("sub_category_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const serviceOrderDetailIdSeq = pgSequence("service_order_detail_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const serviceOrderIdSeq = pgSequence("service_order_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const documentSettingIdSeq = pgSequence("document_setting_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const marketplaceAllowedFileExtensionIdSeq = pgSequence("marketplace_allowed_file_extension_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const marketplaceAppArchiveIdSeq = pgSequence("marketplace_app_archive_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const marketplaceAppFormIdSeq = pgSequence("marketplace_app_form_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const marketplaceAppIdSeq = pgSequence("marketplace_app_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const referHistoryIdSeq = pgSequence("refer_history_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })

export const notification = pgTable("notification", {
	id: serial().primaryKey().notNull(),
	recipientStaffId: uuid("recipient_staff_id").notNull(),
	hospitalId: uuid("hospital_id"),
	eventType: varchar("event_type", { length: 64 }).notNull(),
	severity: varchar({ length: 16 }).default('info').notNull(),
	title: text(),
	message: text().notNull(),
	link: text(),
	visitId: integer("visit_id"),
	referHistoryId: integer("refer_history_id"),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	statusId: integer("status_id").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdBy: text("created_by"),
	updatedBy: text("updated_by"),
	deletedBy: text("deleted_by"),
}, (table) => [
	foreignKey({
			columns: [table.recipientStaffId],
			foreignColumns: [staff.id],
			name: "notification_recipient_staff_id_staff_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.hospitalId],
			foreignColumns: [hospital.id],
			name: "notification_hospital_id_hospital_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.visitId],
			foreignColumns: [patientVisit.id],
			name: "notification_visit_id_patient_visit_id_fk"
		}),
	foreignKey({
			columns: [table.referHistoryId],
			foreignColumns: [referHistory.id],
			name: "notification_refer_history_id_refer_history_id_fk"
		}),
	foreignKey({
			columns: [table.statusId],
			foreignColumns: [status.id],
			name: "notification_status_id_status_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [user.id],
			name: "notification_created_by_user_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [user.id],
			name: "notification_updated_by_user_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.deletedBy],
			foreignColumns: [user.id],
			name: "notification_deleted_by_user_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
]);
