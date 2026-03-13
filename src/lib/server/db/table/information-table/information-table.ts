import { sql } from 'drizzle-orm';
import {
	boolean,
	date,
	decimal,
	foreignKey,
	integer,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	uuid,
	time,
	varchar
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import {
	StatusEnum,
	YesNoEnum
} from '../../../../model/enum/db-link';
import { userTable } from '../auth-table/auth-table';
import {
	bloodTypeTable,
	categoryTable,
	cityTable,
	countryTable,
	departmentTable,
	genderTable,
	identityTypeTable,
	maritalStatusTable,
	nationalityTable,
	postalCodeTable,
	positionTable,
	referTypeTable,
	religionTable,
	severityTable,
	specializationTable,
	staffEmploymentTypeTable,
	staffTypeTable,
	stateTable,
	statusTable,
	titleTable,
	unitTable,
	unitTypeTable,
	visitTypeTable,
	weekdayTable
} from '../master-table/master-table';
import { index } from 'drizzle-orm/pg-core';

const timestamps = {
	createdAt: timestamp('created_at', {
		withTimezone: true,
		mode: 'string'
	})
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', {
		withTimezone: true,
		mode: 'string'
	})
		.notNull()
		.defaultNow()
		.$onUpdate(() => sql`now()`)
} as const;

// Information Tables (alphabetical) - business/transactional data
export const hospitalTable = pgTable('hospital', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	address: text('address'),
	phone: varchar('phone', { length: 64 }),
	phoneCountryId: integer('phone_country_id').references(
		() => countryTable.id
	),
	email: varchar('email', { length: 256 }),
	website: varchar('website', { length: 512 }),
	/** One hospital belongs to one owner (user with role OWNER). One owner has many hospitals. */
	ownerId: text('owner_id').references(() => userTable.id),
	postalCodeId: integer('postal_code_id').references(
		() => postalCodeTable.id
	),
	cityId: integer('city_id').references(() => cityTable.id),
	stateId: integer('state_id').references(() => stateTable.id),
	countryId: integer('country_id').references(() => countryTable.id),
	logoUrl: text('logo_url'),
	description: text('description'),
	establishedDate: date('established_date'),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

/** Branches belong to a hospital (Hospital → many Branches). Branch is a separate entity, not the same level as Hospital. */
export const hospitalBranchTable = pgTable('hospital_branch', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	address: text('address'),
	phone: varchar('phone', { length: 64 }),
	phoneCountryId: integer('phone_country_id').references(
		() => countryTable.id
	),
	email: varchar('email', { length: 256 }),
	postalCodeId: integer('postal_code_id').references(
		() => postalCodeTable.id
	),
	cityId: integer('city_id').references(() => cityTable.id),
	stateId: integer('state_id').references(() => stateTable.id),
	countryId: integer('country_id').references(() => countryTable.id),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

/** Per-hospital atomic counter for patient codes (Hospital Code + number). Each hospital starts at 1. */
export const hospitalPatientCodeCounterTable = pgTable(
	'hospital_patient_code_counter',
	{
		hospitalId: uuid('hospital_id')
			.primaryKey()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		lastNumber: integer('last_number').notNull().default(0),
		...timestamps
	}
);

/** Per-hospital/branch/visit-type/year atomic counter for visit numbers. */
export const hospitalVisitCodeCounterTable = pgTable(
	'hospital_visit_code_counter',
	{
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id, {
				onDelete: 'cascade'
			}),
		visitTypeId: integer('visit_type_id')
			.notNull()
			.references(() => visitTypeTable.id),
		year: integer('year').notNull(),
		lastNumber: integer('last_number').notNull().default(0),
		...timestamps
	},
	(table) => [
		primaryKey({
			columns: [
				table.hospitalId,
				table.branchId,
				table.visitTypeId,
				table.year
			]
		})
	]
);

export const hospitalDepartmentTable = pgTable(
	'hospital_department',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.references(() => hospitalTable.id)
			.notNull(),
		departmentId: integer('department_id')
			.references(() => departmentTable.id)
			.notNull(),
		...timestamps
	}
);

export const moduleTable = pgTable('module', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	imageUrl: text('image_url'),
	moduleUrl: text('module_url'),
	sequenceNo: integer('sequence_no'),
	statusId: integer('status_id')
		.notNull()
		.references(() => statusTable.id),
	...timestamps
});

export const pageTable = pgTable(
	'page',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		parentId: integer('parent_id'),
		imageUrl: text('image_url'),
		pageUrl: text('page_url'),
		sequenceNo: integer('sequence_no'),
		moduleId: integer('module_id').references(() => moduleTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(self) => [
		foreignKey({
			columns: [self.parentId],
			foreignColumns: [self.id]
		})
	]
);

export const staffDetailTable = pgTable('staff_detail', {
	id: serial('id').primaryKey(),
	licenseNo: varchar('license_no', { length: 512 }),
	licenseExpiryDate: date('license_expiry_date'),
	signatureImageUrl: text('signature_image_url'),
	signatureText: text('signature_text'),
	designation: varchar('designation', { length: 512 }),
	education: varchar('education', { length: 512 }),
	bloodTypeId: integer('blood_type_id').references(
		() => bloodTypeTable.id
	),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

export const staffDepartmentTable = pgTable('staff_department', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	departmentId: integer('department_id')
		.notNull()
		.references(() => departmentTable.id),
	...timestamps
});

export const staffHospitalTable = pgTable('staff_hospital', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id),
	...timestamps
});

export const staffBranchTable = pgTable('staff_branch', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	branchId: uuid('branch_id')
		.notNull()
		.references(() => hospitalBranchTable.id, {
			onDelete: 'cascade'
		}),
	...timestamps
});

export const staffTable = pgTable('staff', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	/** Links this staff to Better Auth user (1:1). */
	userId: text('user_id')
		.unique()
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	firstName: varchar('first_name', { length: 512 }),
	middleName: varchar('middle_name', { length: 512 }),
	lastName: varchar('last_name', { length: 512 }),
	code: varchar('code', { length: 512 }),
	phonePrimary: varchar('phone_primary', { length: 128 }),
	phoneSecondary: varchar('phone_secondary', { length: 128 }),
	phonePrimaryCountryId: integer(
		'phone_primary_country_id'
	).references(() => countryTable.id),
	phoneSecondaryCountryId: integer(
		'phone_secondary_country_id'
	).references(() => countryTable.id),
	dateOfBirth: date('date_of_birth'),
	photoUrl: text('photo_url'),
	address: text('address'),
	remark: text('remark'),
	identityNo: varchar('identity_no', { length: 128 }),
	identityTypeId: integer('identity_type_id').references(
		() => identityTypeTable.id
	),
	titleId: integer('title_id').references(() => titleTable.id),
	staffEmploymentTypeId: integer(
		'staff_employment_type_id'
	).references(() => staffEmploymentTypeTable.id),
	staffTypeId: integer('staff_type_id').references(
		() => staffTypeTable.id
	),
	staffDetailId: integer('staff_detail_id').references(
		() => staffDetailTable.id
	),
	cityId: integer('city_id').references(() => cityTable.id),
	stateId: integer('state_id').references(() => stateTable.id),
	countryId: integer('country_id').references(() => countryTable.id),
	maritalStatusId: integer('marital_status_id').references(
		() => maritalStatusTable.id
	),
	nationalityId: integer('nationality_id').references(
		() => nationalityTable.id
	),
	positionId: integer('position_id').references(
		() => positionTable.id
	),
	postalCodeId: integer('postal_code_id').references(
		() => postalCodeTable.id
	),
	specializationId: integer('specialization_id').references(
		() => specializationTable.id
	),
	genderId: integer('gender_id').references(() => genderTable.id),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	//staffHospitalTable
	//staffDepartmentTable
	//staffUserGroupTable
	...timestamps
});

export const staffUserGroupTable = pgTable('staff_user_group', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	userGroupId: integer('user_group_id')
		.notNull()
		.references(() => userGroupTable.id),
	...timestamps
});

export const statusTaggingTable = pgTable('status_tagging', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	sequenceNo: integer('sequence_no'),
	statusTaggingTypeId: integer('status_tagging_type_id').references(
		() => statusTaggingTypeTable.id
	),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

export const statusTaggingTypeTable = pgTable('status_tagging_type', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

export const userGroupPageTable = pgTable('user_group_page', {
	id: serial('id').primaryKey(),
	userGroupId: integer('user_group_id').references(
		() => userGroupTable.id
	),
	pageId: integer('page_id').references(() => pageTable.id),
	...timestamps
});

export const userGroupTable = pgTable('user_group', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	hospitalId: uuid('hospital_id').references(() => hospitalTable.id),
	//userGroupPageTable
	...timestamps
});
export const patientTable = pgTable('patient', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id),
	code: varchar('code', { length: 512 }),
	titleId: integer('title_id').references(() => titleTable.id),
	firstName: varchar('first_name', { length: 512 }),
	middleName: varchar('middle_name', { length: 512 }),
	lastName: varchar('last_name', { length: 512 }),
	userId: text('user_id')
		.unique()
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	phonePrimary: varchar('phone_primary', { length: 128 }),
	phoneSecondary: varchar('phone_secondary', { length: 128 }),
	identityNo: varchar('identity_no', { length: 128 }),
	dateOfBirth: date('date_of_birth'),
	fatherTitleId: integer('father_title_id').references(
		() => titleTable.id
	),
	fatherName: varchar('father_name', { length: 512 }),
	guardianTitleId: integer('guardian_title_id').references(
		() => titleTable.id
	),
	guardianName: varchar('guardian_name', { length: 512 }),
	guardianPhone: varchar('guardian_phone', { length: 128 }),
	guardianPhoneCountryId: integer(
		'guardian_phone_country_id'
	).references(() => countryTable.id),
	photoPath: text('photo_path'),
	address: text('address'),
	remark: text('remark'),
	nameMasking: integer('name_masking')
		.notNull()
		.default(YesNoEnum.NO),
	phonePrimaryCountryId: integer(
		'phone_primary_country_id'
	).references(() => countryTable.id),
	phoneSecondaryCountryId: integer(
		'phone_secondary_country_id'
	).references(() => countryTable.id),
	maritalStatusId: integer('marital_status_id').references(
		() => maritalStatusTable.id
	),
	genderId: integer('gender_id').references(() => genderTable.id),
	identityTypeId: integer('identity_type_id').references(
		() => identityTypeTable.id
	),
	bloodTypeId: integer('blood_type_id').references(
		() => bloodTypeTable.id
	),
	cityId: integer('city_id').references(() => cityTable.id),
	stateId: integer('state_id').references(() => stateTable.id),
	countryId: integer('country_id').references(() => countryTable.id),
	postalCodeId: integer('postal_code_id').references(
		() => postalCodeTable.id
	),
	nationalityId: integer('nationality_id').references(
		() => nationalityTable.id
	),
	religionId: integer('religion_id').references(
		() => religionTable.id
	),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

export const patientAttachmentTable = pgTable('patient_attachment', {
	id: serial('id').primaryKey(),
	patientId: uuid('patient_id')
		.notNull()
		.references(() => patientTable.id),
	fileUrl: text('file_url'),
	description: text('description'),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

export const insuranceTable = pgTable('insurance_table', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

export const patientInsurance = pgTable('patient_insurance', {
	id: serial('id').primaryKey(),
	patientId: uuid('patient_id')
		.notNull()
		.references(() => patientTable.id),
	insuranceId: uuid('insurance_id')
		.notNull()
		.references(() => insuranceTable.id),
	...timestamps
});

export const patientAllergyTable = pgTable('patient_allergy', {
	id: serial('id').primaryKey(),
	visitId: integer('visit_id')
		.notNull()
		.references(() => patientVisitTable.id),
	patientId: uuid('patient_id')
		.notNull()
		.references(() => patientTable.id),
	allergyId: integer('allergy_id')
		.notNull()
		.references(() => allergyTable.id),
	severityId: integer('severity_id')
		.notNull()
		.references(() => severityTable.id),
	reaction: text('reaction'),
	remark: text('remark'),
	deactivationRemark: text('deactivation_remark'),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

/** Document type lookup (consent, form, instruction, certificate, help) */
export const documentTypeTable = pgTable(
	'document_type',
	{
		id: serial('id').primaryKey(),
		documentType: varchar('document_type', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		createdBy: text('created_by').references(() => userTable.id),
		...timestamps
	},
	(table) => [
		index('document_type_name_idx').on(table.documentType),
		index('document_type_status_id_idx').on(table.statusId)
	]
);

/** Document setting - template configuration for document layout and placeholders */
export const documentSettingTable = pgTable(
	'document_setting',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }).notNull(),
		documentTypeId: integer('document_type_id').references(
			() => documentTypeTable.id
		),
		hospitalId: uuid('hospital_id').references(
			() => hospitalTable.id
		),
		// Page layout settings (in mm)
		marginTop: integer('margin_top').default(20),
		marginBottom: integer('margin_bottom').default(20),
		marginLeft: integer('margin_left').default(15),
		marginRight: integer('margin_right').default(15),
		paddingTop: integer('padding_top').default(10),
		paddingBottom: integer('padding_bottom').default(10),
		paddingLeft: integer('padding_left').default(10),
		paddingRight: integer('padding_right').default(10),
		// Page size
		pageSize: varchar('page_size', { length: 20 }).default('A4'),
		pageOrientation: varchar('page_orientation', {
			length: 20
		}).default('portrait'),
		// Header and footer templates (HTML with placeholders)
		headerHtml: text('header_html'),
		footerHtml: text('footer_html'),
		// Show/hide header footer
		showHeader: boolean('show_header').default(true),
		showFooter: boolean('show_footer').default(true),
		// Description
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		createdBy: text('created_by').references(() => userTable.id),
		...timestamps
	},
	(table) => [
		index('document_setting_name_idx').on(table.name),
		index('document_setting_document_type_id_idx').on(
			table.documentTypeId
		),
		index('document_setting_hospital_id_idx').on(table.hospitalId),
		index('document_setting_status_id_idx').on(table.statusId)
	]
);

/** Document master - stores document templates with HTML content */
export const documentTable = pgTable(
	'document',
	{
		id: serial('id').primaryKey(),
		documentTypeId: integer('document_type_id')
			.notNull()
			.references(() => documentTypeTable.id),
		code: varchar('code', { length: 128 }),
		documentText: text('document_text'),
		documentNumber: varchar('document_number', { length: 128 }),
		documentSettingId: integer('document_setting_id').references(
			() => documentSettingTable.id
		),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		createdBy: text('created_by').references(() => userTable.id),
		...timestamps
	},
	(table) => [
		index('document_code_idx').on(table.code),
		index('document_document_type_id_idx').on(table.documentTypeId),
		index('document_status_id_idx').on(table.statusId)
	]
);

/** Patient document - links documents to visits (clinical document sub page) */
export const patientDocumentTable = pgTable(
	'patient_document',
	{
		id: serial('id').primaryKey(),
		visitId: integer('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		documentId: integer('document_id')
			.notNull()
			.references(() => documentTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		createdBy: text('created_by').references(() => userTable.id),
		...timestamps
	},
	(table) => [
		index('patient_document_visit_id_idx').on(table.visitId),
		index('patient_document_patient_id_idx').on(table.patientId),
		index('patient_document_document_id_idx').on(table.documentId),
		index('patient_document_status_id_idx').on(table.statusId)
	]
);

export const doctorScheduleTable = pgTable('doctor_schedule', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id),
	branchId: uuid('branch_id')
		.notNull()
		.references(() => hospitalBranchTable.id),
	weekdayId: integer('weekday_id')
		.notNull()
		.references(() => weekdayTable.id),
	fromDate: date('from_date'),
	toDate: date('to_date'),
	fromShiftTime: time('from_shift_time'),
	toShiftTime: time('to_shift_time'),
	/** Slot duration in minutes (e.g. 10, 15, 20) for calendar time blocks. Saved from "Slot Timing" on create. */
	slotDurationMinutes: integer('slot_duration_minutes').default(15),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

export const externalReferTable = pgTable('external_refer', {
	id: serial('id').primaryKey(),
	referTypeId: integer('refer_type_id').references(
		() => referTypeTable.id
	),
	hospitalId: uuid('hospital_id').references(() => hospitalTable.id),
	titleId: integer('title_id').references(() => titleTable.id),
	name: varchar('name', { length: 512 }),
	address: text('address'),
	countryId: integer('country_id').references(() => countryTable.id),
	stateId: integer('state_id').references(() => stateTable.id),
	cityId: integer('city_id').references(() => cityTable.id),
	postalCodeId: integer('postal_code_id').references(
		() => postalCodeTable.id
	),
	phoneCountryId: integer('phone_country_id').references(
		() => countryTable.id
	),
	phone: varchar('phone', { length: 128 }),
	email: varchar('email', { length: 512 }),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

export const appointmentTable = pgTable('appointment', {
	id: serial('id').primaryKey(),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id),
	branchId: uuid('branch_id')
		.notNull()
		.references(() => hospitalBranchTable.id),
	patientId: uuid('patient_id').references(() => patientTable.id),
	staffId: uuid('staff_id').references(() => staffTable.id),
	appointmentDate: date('appointment_date'),
	fromTime: time('from_time'),
	toTime: time('to_time'),
	patientTitleId: integer('patient_title_id').references(
		() => titleTable.id
	),
	patientName: varchar('patient_name', { length: 512 }),
	patientDateOfBirth: date('patient_date_of_birth'),
	patientAgeYear: integer('patient_age_year'),
	patientAgeMonth: integer('patient_age_month'),
	patientAgeDay: integer('patient_age_day'),
	appointmentPhone: varchar('appointment_phone', { length: 128 }),
	appointmentEmail: varchar('appointment_email', { length: 512 }),
	referTypeId: integer('refer_type_id').references(
		() => referTypeTable.id
	),
	externalReferId: integer('external_refer_id').references(
		() => externalReferTable.id
	),
	statusTaggingId: integer('status_tagging_id').references(
		() => statusTaggingTable.id
	),
	remark: text('remark'),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

/** Appointment block: blocked time slots for a staff (doctor); no appointments can be booked in these ranges. */
export const appointmentBlockTable = pgTable('appointment_block', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	hospitalId: uuid('hospital_id').references(() => hospitalTable.id),
	blockDate: date('block_date').notNull(),
	fromTime: time('from_time').notNull(),
	toTime: time('to_time').notNull(),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

/** Patient visit to a hospital/branch; may be linked to an appointment and doctor. */
export const patientVisitTable = pgTable('patient_visit', {
	id: serial('id').primaryKey(),
	patientId: uuid('patient_id')
		.notNull()
		.references(() => patientTable.id),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id),
	branchId: uuid('branch_id')
		.notNull()
		.references(() => hospitalBranchTable.id),
	appointmentId: integer('appointment_id').references(
		() => appointmentTable.id
	),
	doctorId: uuid('doctor_id').references(() => staffTable.id),
	statusTypeId: integer('status_type_id'),
	visitTypeId: integer('visit_type_id').references(
		() => visitTypeTable.id
	),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	visitNo: varchar('visit_no', { length: 128 }),
	...timestamps
});

/** Patient diagnosis / vitals and symptoms for a visit. */
export const patientDiagnosisTable = pgTable('patient_diagnosis', {
	id: serial('id').primaryKey(),
	patientId: uuid('patient_id')
		.notNull()
		.references(() => patientTable.id),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id),
	visitId: integer('visit_id')
		.notNull()
		.references(() => patientVisitTable.id),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	height: decimal('height', { precision: 10, scale: 2 }),
	heightUnitId: integer('height_unit_id').references(
		() => unitTable.id
	),
	weight: decimal('weight', { precision: 10, scale: 2 }),
	weightUnitId: integer('weight_unit_id').references(
		() => unitTable.id
	),
	bpSystolic: decimal('bp_systolic', { precision: 10, scale: 2 }),
	bpDiastolic: decimal('bp_diastolic', { precision: 10, scale: 2 }),
	bpUnitId: integer('bp_unit_id').references(() => unitTable.id),
	pulse: decimal('pulse', { precision: 10, scale: 2 }),
	pulseUnitId: integer('pulse_unit_id').references(
		() => unitTable.id
	),
	temperature: decimal('temperature', { precision: 10, scale: 2 }),
	temperatureUnitId: integer('temperature_unit_id').references(
		() => unitTable.id
	),
	spO2: decimal('sp_o2', { precision: 10, scale: 2 }),
	spO2UnitId: integer('sp_o2_unit_id').references(() => unitTable.id),
	respiration: decimal('respiration', { precision: 10, scale: 2 }),
	respirationUnitId: integer('respiration_unit_id').references(
		() => unitTable.id
	),
	rbs: decimal('rbs', { precision: 10, scale: 2 }),
	rbsUnitId: integer('rbs_unit_id').references(() => unitTable.id),
	symptom: text('symptom'),
	description: text('description'),
	remark: text('remark'),
	vitalDateTime: timestamp('vital_date_time', {
		withTimezone: true,
		mode: 'string'
	}),
	...timestamps
});

export const subCategoryTable = pgTable('sub_category', {
	id: serial('id').primaryKey(),
	categoryId: integer('category_id')
		.notNull()
		.references(() => categoryTable.id, { onDelete: 'cascade' }),
	subCategoryName: varchar('sub_category_name', { length: 512 }),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	updatedBy: text('updated_by').references(() => userTable.id),
	...timestamps
});

export const serviceItemTable = pgTable('service_item', {
	id: serial('id').primaryKey(),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id, { onDelete: 'cascade' }),
	subCategoryId: integer('sub_category_id')
		.notNull()
		.references(() => subCategoryTable.id, { onDelete: 'cascade' }),
	serviceName: varchar('service_name', { length: 512 }),
	serviceCode: varchar('service_code', { length: 128 }),
	remark: text('remark'),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	updatedBy: text('updated_by').references(() => userTable.id),
	...timestamps
});

export const serviceTaggingTable = pgTable('service_tagging', {
	id: serial('id').primaryKey(),
	branchId: uuid('branch_id')
		.notNull()
		.references(() => hospitalBranchTable.id, {
			onDelete: 'cascade'
		}),
	serviceId: integer('service_id')
		.notNull()
		.references(() => serviceItemTable.id, { onDelete: 'cascade' }),
	validDate: date('valid_date'),
	serviceAmount: decimal('service_amount', {
		precision: 10,
		scale: 2
	}),
	serviceTaxAmount: decimal('service_tax_amount', {
		precision: 10,
		scale: 2
	}),
	allowEdit: boolean('allow_edit').notNull().default(true),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	updatedBy: text('updated_by').references(() => userTable.id),
	...timestamps
});

export const serviceOrderTable = pgTable('service_order', {
	id: serial('id').primaryKey(),
	branchId: uuid('branch_id')
		.notNull()
		.references(() => hospitalBranchTable.id, {
			onDelete: 'cascade'
		}),
	orderDate: date('order_date'),
	orderTime: time('order_time'),
	orderNo: varchar('order_no', { length: 128 }),
	visitId: integer('visit_id')
		.notNull()
		.references(() => patientVisitTable.id, {
			onDelete: 'cascade'
		}),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	createdBy: text('created_by').references(() => userTable.id),
	updatedBy: text('updated_by').references(() => userTable.id),
	...timestamps
});

export const serviceOrderDetailTable = pgTable(
	'service_order_detail',
	{
		id: serial('id').primaryKey(),
		serviceOrderId: integer('service_order_id')
			.notNull()
			.references(() => serviceOrderTable.id, {
				onDelete: 'cascade'
			}),
		serviceId: integer('service_id')
			.notNull()
			.references(() => serviceItemTable.id, { onDelete: 'cascade' }),
		advisingDoctorId: uuid('advising_doctor_id').references(
			() => staffTable.id
		),
		instruction: text('instruction'),
		isUrgent: boolean('is_urgent').notNull().default(false),
		discount: decimal('discount', {
			precision: 10,
			scale: 2
		}),
		serviceAmount: decimal('service_amount', {
			precision: 10,
			scale: 2
		}),
		serviceTaxAmount: decimal('service_tax_amount', {
			precision: 10,
			scale: 2
		}),
		serviceUnit: integer('service_unit'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		createdBy: text('created_by').references(() => userTable.id),
		updatedBy: text('updated_by').references(() => userTable.id),
		cancelBy: text('cancel_by').references(() => userTable.id),
		cancelRemark: text('cancel_remark'),
		...timestamps
	}
);

export const storeTable = pgTable('store', {
	id: serial('id').primaryKey(),
	branchId: uuid('branch_id')
		.notNull()
		.references(() => hospitalBranchTable.id, {
			onDelete: 'cascade'
		}),
	storeName: varchar('store_name', { length: 512 }),
	remark: text('remark'),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	updatedBy: text('updated_by').references(() => userTable.id),
	...timestamps
});

export const allergyTable = pgTable('allergy', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});
