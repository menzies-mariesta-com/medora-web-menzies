import { sql } from 'drizzle-orm';
import {
	type AnyPgColumn,
	boolean,
	check,
	date,
	decimal,
	foreignKey,
	integer,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	jsonb,
	uuid,
	unique,
	uniqueIndex,
	time,
	varchar
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import {
	StatusEnum,
	YesNoEnum
} from '../../../../model/enum/db-link';
import { BillingDiscountTypeEnum } from '../../../../model/enum/billing-discount-type.enum';
import { userTable } from '../auth-table/auth-table';
import {
	bloodTypeTable,
	billingDiscountTypeTable,
	categoryTable,
	cityTable,
	countryTable,
	departmentTable,
	genderTable,
	identityTypeTable,
	maritalStatusTable,
	nationalityTable,
	diagnosisTypeTable,
	formNameTable,
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
		.$onUpdate(() => sql`now()`),
	deletedAt: timestamp('deleted_at', {
		withTimezone: true,
		mode: 'string'
	}),
	createdBy: text('created_by').references(
		(): AnyPgColumn => userTable.id,
		{
			onDelete: 'set null',
			onUpdate: 'cascade'
		}
	),
	updatedBy: text('updated_by').references(
		(): AnyPgColumn => userTable.id,
		{
			onDelete: 'set null',
			onUpdate: 'cascade'
		}
	),
	deletedBy: text('deleted_by').references(
		(): AnyPgColumn => userTable.id,
		{
			onDelete: 'set null',
			onUpdate: 'cascade'
		}
	)
} as const;

/** Many-to-many junction tables: timestamps + user tracking, no soft delete. */
const junctionTimestamps = {
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
		.$onUpdate(() => sql`now()`),
	createdBy: text('created_by').references(
		(): AnyPgColumn => userTable.id,
		{
			onDelete: 'set null',
			onUpdate: 'cascade'
		}
	),
	updatedBy: text('updated_by').references(
		(): AnyPgColumn => userTable.id,
		{
			onDelete: 'set null',
			onUpdate: 'cascade'
		}
	)
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

/** Financial year per hospital (e.g. FY24-25). */
export const financialYearTable = pgTable(
	'financial_year',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 128 }), // e.g. "FY24-25"
		startDate: date('start_date'),
		endDate: date('end_date'),
		...timestamps
	},
	(table) => [
		unique('financial_year_hospital_code_unique').on(
			table.hospitalId,
			table.code
		)
	]
);

/** Format template per hospital + purpose key (no counter). */
export const prefixFormatTable = pgTable(
	'prefix_format',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		key: varchar('key', { length: 128 }).notNull(),
		description: text('description'),
		format: jsonb('format').notNull(),
		/** Which dimensions participate in {@link prefixCounterTable.scopeKey} (hospital + key always). */
		counterIncludeBranch: integer('counter_include_branch')
			.notNull()
			.default(YesNoEnum.NO),
		counterIncludeFinancialYear: integer('counter_include_financial_year')
			.notNull()
			.default(YesNoEnum.YES),
		counterIncludeVisitType: integer('counter_include_visit_type')
			.notNull()
			.default(YesNoEnum.NO),
		/** When YES, append context visit id to {@link prefixCounterTable.scopeKey} when provided (e.g. ORDER_NO). */
		counterIncludeVisit: integer('counter_include_visit')
			.notNull()
			.default(YesNoEnum.NO),
		...timestamps
	},
	(table) => [
		unique('prefix_format_hospital_key_unique').on(table.hospitalId, table.key)
	]
);

/**
 * Running number per scope (hospital / branch / financial year / visit type / visit × purpose).
 * `scopeKey` is unique; use {@link buildPrefixCounterScopeKey} from `$lib/tool/prefix/prefix-counter-scope.util`.
 */
export const prefixCounterTable = pgTable('prefix_counter', {
	id: serial('id').primaryKey(),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id, { onDelete: 'cascade' }),
	branchId: uuid('branch_id').references(() => hospitalBranchTable.id, {
		onDelete: 'cascade'
	}),
	financialYearId: integer('financial_year_id').references(
		() => financialYearTable.id,
		{ onDelete: 'set null' }
	),
	visitTypeId: integer('visit_type_id').references(() => visitTypeTable.id, {
		onDelete: 'set null'
	}),
	key: varchar('key', { length: 128 }).notNull(),
	scopeKey: text('scope_key').notNull().unique(),
	lastNo: integer('last_no').notNull().default(0),
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
});

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
	...junctionTimestamps
});

export const staffHospitalTable = pgTable('staff_hospital', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id),
	...junctionTimestamps
});

export const staffBranchTable = pgTable(
	'staff_branch',
	{
		id: serial('id').primaryKey(),
		staffId: uuid('staff_id')
			.notNull()
			.references(() => staffTable.id),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id, {
				onDelete: 'cascade'
			}),
		...junctionTimestamps
	},
	(t) => [
		unique('staff_branch_staff_id_branch_id_unique').on(
			t.staffId,
			t.branchId
		)
	]
);

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
	joinDate: date('join_date'),
	resignDate: date('resign_date'),
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

export const staffUserGroupTable = pgTable(
	'staff_user_group',
	{
		id: serial('id').primaryKey(),
		staffId: uuid('staff_id')
			.notNull()
			.references(() => staffTable.id),
		userGroupId: integer('user_group_id')
			.notNull()
			.references(() => userGroupTable.id),
		...junctionTimestamps
	},
	(t) => [
		unique('staff_user_group_staff_id_user_group_id_unique').on(
			t.staffId,
			t.userGroupId
		)
	]
);

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
	...junctionTimestamps
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
	...junctionTimestamps
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
		/** PDF stored as patient_attachment when printed from EMR */
		patientAttachmentId: integer('patient_attachment_id').references(
			() => patientAttachmentTable.id
		),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('patient_document_visit_id_idx').on(table.visitId),
		index('patient_document_patient_id_idx').on(table.patientId),
		index('patient_document_document_id_idx').on(table.documentId),
		index('patient_document_status_id_idx').on(table.statusId),
		index('patient_document_patient_attachment_id_idx').on(
			table.patientAttachmentId
		)
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
	/** Reason required when appointment status is "Cancel". */
	cancelRemark: text('cancel_remark'),
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
	/** Required remark describing why this time is blocked. */
	remark: text('remark'),
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
	statusTaggingId: integer('status_tagging_id').references(
		() => statusTaggingTable.id
	),
	visitTypeId: integer('visit_type_id').references(
		() => visitTypeTable.id
	),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	visitNo: varchar('visit_no', { length: 128 }),
	/** Observation / EMR narrative fields (nullable). */
	chiefComplaint: text('chief_complaint'),
	patientCondition: text('patient_condition'),
	diagnosisNotes: text('diagnosis_notes'),
	/** Set once from Observation EMR “Save as signed”; locks visit-scoped clinical edits across Observation / Nursing / CPOE. */
	clinicalSignedAt: timestamp('clinical_signed_at', {
		withTimezone: true,
		mode: 'string'
	}),
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
	/** Body mass index (kg/m²); may be calculated from height (cm) and weight (kg) or entered manually. */
	bmi: decimal('bmi', { precision: 10, scale: 2 }),
	symptom: text('symptom'),
	description: text('description'),
	remark: text('remark'),
	vitalDateTime: timestamp('vital_date_time', {
		withTimezone: true,
		mode: 'string'
	}),
	...timestamps
});

/** Patient visit diagnosis classification (Provisional / Final / Chronic). */
export const diagnosisTable = pgTable(
	'diagnosis',
	{
		id: serial('id').primaryKey(),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: integer('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		diagnosisTypeId: integer('diagnosis_type_id')
			.notNull()
			.references(() => diagnosisTypeTable.id),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('diagnosis_branch_id_idx').on(table.branchId),
		index('diagnosis_patient_id_idx').on(table.patientId),
		index('diagnosis_visit_id_idx').on(table.visitId),
		index('diagnosis_diagnosis_type_id_idx').on(table.diagnosisTypeId)
	]
);

/** Visit form entries (chief complaint, patient condition, etc.) linked to form_name master. */
export const patientFormEntryTable = pgTable(
	'patient_form_entry',
	{
		id: serial('id').primaryKey(),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: integer('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		formNameId: integer('form_name_id')
			.notNull()
			.references(() => formNameTable.id),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('patient_form_entry_branch_id_idx').on(table.branchId),
		index('patient_form_entry_patient_id_idx').on(table.patientId),
		index('patient_form_entry_visit_id_idx').on(table.visitId),
		index('patient_form_entry_form_name_id_idx').on(table.formNameId),
		index('patient_form_entry_status_id_idx').on(table.statusId)
	]
);

/** Visit plan-of-care entries (multiple per visit; Observation EMR). */
export const planOfCareTable = pgTable(
	'plan_of_care',
	{
		id: serial('id').primaryKey(),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: integer('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		note: text('note').notNull().default(''),
		deleteRemark: text('delete_remark'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		doctorId: uuid('doctor_id').references(() => staffTable.id),
		sequenceNo: integer('sequence_no').notNull().default(0),
		...timestamps
	},
	(table) => [
		index('plan_of_care_visit_id_idx').on(table.visitId),
		index('plan_of_care_patient_id_idx').on(table.patientId),
		index('plan_of_care_branch_id_idx').on(table.branchId),
		index('plan_of_care_status_id_idx').on(table.statusId)
	]
);

/** Visit progress notes (multiple per visit; Observation EMR). */
export const progressNoteTable = pgTable(
	'progress_note',
	{
		id: serial('id').primaryKey(),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: integer('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		note: text('note').notNull().default(''),
		deleteRemark: text('delete_remark'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		doctorId: uuid('doctor_id').references(() => staffTable.id),
		sequenceNo: integer('sequence_no').notNull().default(0),
		...timestamps
	},
	(table) => [
		index('progress_note_visit_id_idx').on(table.visitId),
		index('progress_note_patient_id_idx').on(table.patientId),
		index('progress_note_branch_id_idx').on(table.branchId),
		index('progress_note_status_id_idx').on(table.statusId)
	]
);

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
	...timestamps
});

/** Per-hospital pharmacy generic names (for Item Master Pharmacy Supply). */
export const pharmacyGenericTable = pgTable(
	'pharmacy_generic',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 128 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('pharmacy_generic_hospital_id_idx').on(t.hospitalId),
		index('pharmacy_generic_name_idx').on(t.name),
		index('pharmacy_generic_status_id_idx').on(t.statusId)
	]
);

/** Per-hospital manufacturer (Item Master link; address pattern matches hospital_branch). */
export const manufacturerTable = pgTable(
	'manufacturer',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
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
		remark: text('remark'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('manufacturer_hospital_id_idx').on(t.hospitalId),
		index('manufacturer_name_idx').on(t.name),
		index('manufacturer_status_id_idx').on(t.statusId)
	]
);

/** Per-hospital supplier master (inventory / purchasing). */
export const supplierTable = pgTable(
	'supplier',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
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
		remark: text('remark'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('supplier_hospital_id_idx').on(t.hospitalId),
		index('supplier_name_idx').on(t.name),
		index('supplier_status_id_idx').on(t.statusId)
	]
);

/**
 * Inventory / supply item catalog per hospital. Category must be one of the Item Master rows in
 * `category` (ids 11–13: General, Pharmacy, Medical Supply — see seed / migration).
 */
export const itemMasterTable = pgTable(
	'item_master',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		itemName: varchar('item_name', { length: 512 }).notNull(),
		categoryId: integer('category_id')
			.notNull()
			.references(() => categoryTable.id, { onDelete: 'restrict' }),
		itemCode: varchar('item_code', { length: 128 }),
		/** EAN/UPC/Code128 or internal barcode; unique per hospital when not null. */
		barcode: varchar('barcode', { length: 128 }),
		manufacturerId: integer('manufacturer_id').references(
			() => manufacturerTable.id,
			{ onDelete: 'restrict' }
		),
		pharmacyGenericId: integer('pharmacy_generic_id').references(
			() => pharmacyGenericTable.id,
			{ onDelete: 'restrict' }
		),
		description: text('description'),
		remark: text('remark'),
		/** Pharmacy / regulated items: GRN must capture batch, expiry, and purchase price. */
		isBatchRequired: boolean('is_batch_required').notNull().default(false),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('item_master_hospital_id_idx').on(t.hospitalId),
		index('item_master_category_id_idx').on(t.categoryId),
		index('item_master_item_name_idx').on(t.itemName),
		index('item_master_status_id_idx').on(t.statusId),
		index('item_master_barcode_idx').on(t.barcode),
		index('item_master_manufacturer_id_idx').on(t.manufacturerId),
		uniqueIndex('item_master_hospital_barcode_unique')
			.on(t.hospitalId, t.barcode)
			.where(sql`${t.barcode} IS NOT NULL`),
		check(
			'item_master_category_supply_chk',
			sql`(${t.categoryId}) IN (11, 12, 13)`
		),
		check(
			'item_master_pharmacy_supply_generic_chk',
			sql`(${t.categoryId}) <> 12 OR ${t.pharmacyGenericId} IS NOT NULL`
		)
	]
);

/** Purchase vs issue unit conversion per hospital item (one active row per item). */
export const itemUnitMasterTable = pgTable(
	'item_unit_master',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		purchaseUnitId: integer('purchase_unit_id')
			.notNull()
			.references(() => unitTable.id, { onDelete: 'restrict' }),
		purchaseConversionFactor: decimal('purchase_conversion_factor', {
			precision: 18,
			scale: 6
		}).notNull(),
		issueUnitId: integer('issue_unit_id')
			.notNull()
			.references(() => unitTable.id, { onDelete: 'restrict' }),
		issueConversionFactor: decimal('issue_conversion_factor', {
			precision: 18,
			scale: 6
		}).notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('item_unit_master_hospital_id_idx').on(t.hospitalId),
		index('item_unit_master_status_id_idx').on(t.statusId),
		uniqueIndex('item_unit_master_hospital_units_unique')
			.on(t.hospitalId, t.purchaseUnitId, t.issueUnitId)
			.where(sql`${t.deletedAt} IS NULL`),
		check(
			'item_unit_master_factors_positive_chk',
			sql`${t.purchaseConversionFactor}::numeric > 0 AND ${t.issueConversionFactor}::numeric > 0`
		)
	]
);

/** Item Master ↔ Item Unit Master (unit conversion tagging; multiple conversions per item). */
export const itemMasterItemUnitMasterTable = pgTable(
	'item_master_item_unit_master',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		itemMasterId: integer('item_master_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'cascade' }),
		itemUnitMasterId: integer('item_unit_master_id')
			.notNull()
			.references(() => itemUnitMasterTable.id, { onDelete: 'restrict' }),
		/** {@link YesNoEnum}: exactly one YES per item among active links. */
		isDefaultYesNo: integer('is_default_yes_no')
			.notNull()
			.default(YesNoEnum.NO),
		...timestamps
	},
	(t) => [
		index('im_ium_hospital_id_idx').on(t.hospitalId),
		index('im_ium_item_master_id_idx').on(t.itemMasterId),
		index('im_ium_item_unit_master_id_idx').on(t.itemUnitMasterId),
		uniqueIndex('im_ium_hospital_item_unit_unique')
			.on(t.hospitalId, t.itemMasterId, t.itemUnitMasterId)
			.where(sql`${t.deletedAt} IS NULL`),
		check(
			'im_ium_is_default_yes_no_chk',
			sql`${t.isDefaultYesNo} IN (0, 1)`
		),
		uniqueIndex('im_ium_one_default_per_item_unique')
			.on(t.hospitalId, t.itemMasterId)
			.where(
				sql`${t.deletedAt} IS NULL AND ${t.isDefaultYesNo} = 1`
			)
	]
);

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
		nursingCompleteTime: timestamp('nursing_complete_time', {
			withTimezone: true,
			mode: 'string'
		}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		cancelBy: text('cancel_by').references(() => userTable.id),
		cancelRemark: text('cancel_remark'),
		...timestamps
	}
);

/**
 * OP billing header for a visit. Multiple rows per visit are allowed: each
 * closed bill (`printed_at` set) freezes its lines; a new open draft appears
 * when there are nursing-complete lines not yet on any closed bill.
 */
export const opBillingTable = pgTable(
	'op_billing',
	{
		id: serial('id').primaryKey(),
		visitId: integer('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id, { onDelete: 'cascade' }),
		billNo: varchar('bill_no', { length: 128 }),
		/** Sum of `op_billing_line.line_total` before visit-level discount. */
		linesSubtotal: decimal('lines_subtotal', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		discountTypeId: integer('discount_type_id')
			.notNull()
			.references(() => billingDiscountTypeTable.id)
			.default(BillingDiscountTypeEnum.NONE),
		/** When `discount_type_id` is PERCENT, stores 0–100. */
		discountPercent: decimal('discount_percent', {
			precision: 5,
			scale: 2
		}),
		/** Money removed at visit level (fixed amount, or computed % at save time). */
		discountAmount: decimal('discount_amount', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		/** Payable total after visit-level discount. */
		totalAmount: decimal('total_amount', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		discountedByStaffId: uuid('discounted_by_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		discountedAt: timestamp('discounted_at', {
			withTimezone: true,
			mode: 'string'
		}),
		printedByStaffId: uuid('printed_by_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		printedAt: timestamp('printed_at', {
			withTimezone: true,
			mode: 'string'
		}),
		remark: text('remark'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('op_billing_visit_id_idx').on(table.visitId),
		index('op_billing_hospital_id_idx').on(table.hospitalId),
		index('op_billing_branch_id_idx').on(table.branchId),
		index('op_billing_bill_no_idx').on(table.billNo),
		index('op_billing_status_id_idx').on(table.statusId),
		index('op_billing_discount_type_id_idx').on(table.discountTypeId)
	]
);

/** Snapshot of each service line on an OP bill (immutable billing record). */
export const opBillingLineTable = pgTable(
	'op_billing_line',
	{
		id: serial('id').primaryKey(),
		opBillingId: integer('op_billing_id')
			.notNull()
			.references(() => opBillingTable.id, { onDelete: 'cascade' }),
		lineIndex: integer('line_index').notNull(),
		serviceOrderDetailId: integer('service_order_detail_id').references(
			() => serviceOrderDetailTable.id,
			{ onDelete: 'set null' }
		),
		serviceId: integer('service_id')
			.notNull()
			.references(() => serviceItemTable.id, { onDelete: 'restrict' }),
		serviceNameSnapshot: varchar('service_name_snapshot', {
			length: 512
		}),
		subCategoryId: integer('sub_category_id').references(
			() => subCategoryTable.id,
			{ onDelete: 'set null' }
		),
		subCategoryNameSnapshot: varchar('sub_category_name_snapshot', {
			length: 512
		}),
		orderNoSnapshot: varchar('order_no_snapshot', { length: 128 }),
		discount: decimal('discount', { precision: 14, scale: 2 }),
		serviceAmount: decimal('service_amount', {
			precision: 14,
			scale: 2
		}),
		serviceTaxAmount: decimal('service_tax_amount', {
			precision: 14,
			scale: 2
		}),
		serviceUnit: integer('service_unit'),
		/** (amount + tax − line discount) × unit — stored for reporting/print. */
		lineTotal: decimal('line_total', {
			precision: 14,
			scale: 2
		}).notNull(),
		...timestamps
	},
	(table) => [
		index('op_billing_line_op_billing_id_idx').on(table.opBillingId),
		index('op_billing_line_service_id_idx').on(table.serviceId),
		index(
			'op_billing_line_service_order_detail_id_idx'
		).on(table.serviceOrderDetailId)
	]
);

export const storeTable = pgTable('store', {
	id: serial('id').primaryKey(),
	branchId: uuid('branch_id')
		.notNull()
		.references(() => hospitalBranchTable.id, {
			onDelete: 'cascade'
		}),
	/** When true, store may create purchase requisitions. */
	isPurchaseRequisitable: boolean('is_purchase_requisitable')
		.notNull()
		.default(false),
	storeName: varchar('store_name', { length: 512 }),
	remark: text('remark'),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

/** Many-to-many: a store can be linked to zero or more user groups. */
export const storeUserGroupTable = pgTable(
	'store_user_group',
	{
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'cascade' }),
		userGroupId: integer('user_group_id')
			.notNull()
			.references(() => userGroupTable.id, { onDelete: 'restrict' }),
		...junctionTimestamps
	},
	(t) => [
		primaryKey({
			name: 'store_user_group_pk',
			columns: [t.storeId, t.userGroupId]
		})
	]
);

/** IT / helpdesk tickets submitted from the global support dialog. */
export const supportTicketTable = pgTable('support_ticket', {
	id: serial('id').primaryKey(),
	subject: varchar('subject', { length: 512 }).notNull(),
	description: text('description').notNull(),
	/** Workflow: open | in_progress | resolved | closed */
	status: varchar('status', { length: 32 }).notNull().default('open'),
	/** 1 = low … 4 = urgent (app labels) */
	priority: integer('priority').notNull().default(2),
	requesterId: text('requester_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'restrict' }),
	hospitalId: uuid('hospital_id').references(() => hospitalTable.id, {
		onDelete: 'set null'
	}),
	/** Page URL when the ticket was created (pathname + search) */
	contextUrl: text('context_url'),
	assignedToUserId: text('assigned_to_user_id').references(
		() => userTable.id,
		{ onDelete: 'set null' }
	),
	resolution: text('resolution'),
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

export const referHistoryTable = pgTable('refer_history', {
	id: serial('id').primaryKey(),
	visitId: integer('visit_id')
		.notNull()
		.references(() => patientVisitTable.id),
	referAt: timestamp('refer_at', {
		withTimezone: true,
		mode: 'string'
	})
		.notNull()
		.defaultNow(),
	fromBranchId: uuid('from_branch_id').references(
		() => hospitalBranchTable.id
	),
	toBranchId: uuid('to_branch_id').references(
		() => hospitalBranchTable.id
	),
	fromReferDoctorId: uuid('from_refer_doctorid').references(
		() => staffTable.id
	),
	toReferDoctorId: uuid('to_refer_doctorid').references(
		() => staffTable.id
	),
	isUrgent: integer('is_urgent').default(YesNoEnum.NO),
	referRequestNote: text('refer_request_note'),
	/** When the referral was accepted (timezone-aware) */
	acceptAt: timestamp('accept_at', {
		withTimezone: true,
		mode: 'string'
	}),
	// Separate cancel fields (instead of reusing referReplyNote)
	cancelBy: text('cancel_by').references(() => userTable.id),
	cancelAt: timestamp('cancel_at', {
		withTimezone: true,
		mode: 'string'
	}),
	cancelRemark: text('cancel_remark'),
	referReplyNote: text('refer_reply_note'),
	subject: text('subject'),
	...timestamps
});
