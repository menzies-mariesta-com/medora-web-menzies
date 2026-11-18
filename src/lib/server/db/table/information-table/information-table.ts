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
	index,
	time,
	varchar
} from 'drizzle-orm/pg-core';
import { uuidV7 } from '../../../../util/id.util';
import {
	IpdAdmissionStatusEnum,
	IpdBedStatusEnum,
	IpdBedBookingStatusTaggingEnum,
	IpdBedTransferReqStatusTaggingEnum,
	IpdAdmissionOrderStatusTaggingEnum,
	IpdAdmissionCareLevelEnum,
	IpdAdmissionUrgencyEnum,
	BillingStatusTaggingEnum,
	StatusEnum,
	YesNoEnum
} from '../../../../model/enum/db-link';
import { BillingDiscountTypeEnum } from '../../../../model/enum/billing-discount-type.enum';
import { BillingVisitOpenModeEnum } from '../../../../model/enum/billing-visit-open-mode.enum';
import { PageActionEnum } from '../../../../model/enum/page-action.enum';
import { userTable } from '../auth-table/auth-table';
import { documentTable, documentTypeTable } from '../master-table/master-table';
import {
	bloodTypeTable,
	billingDiscountTypeTable,
	categoryTable,
	cityTable,
	countryTable,
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

/** Master/config tables whose migration created only created_at + updated_at. */
const masterTimestamps = {
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
		.$defaultFn(() => uuidV7()),
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
	/**
	 * Bound diagnosis coding standard (ICD10 | ICD11).
	 * Global catalogs live in `diagnosis_code` (ICD10 | ICD10_CM | ICD11);
	 * search filters by this value.
	 */
	codingSystem: varchar('coding_system', { length: 32 })
		.notNull()
		.default('ICD10'),
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
		.$defaultFn(() => uuidV7()),
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
			table.code,
			table.hospitalId
		)
	]
);

/** Hospital-scoped color overrides for UI badges, borders, ribbons. */
export const hospitalColorConfigTable = pgTable(
	'hospital_color_config',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		category: varchar('category', { length: 64 }).notNull(),
		entityKey: varchar('entity_key', { length: 128 }).notNull(),
		color: varchar('color', { length: 32 }).notNull(),
		...timestamps
	},
	(table) => [
		uniqueIndex('hospital_color_config_hospital_cat_key_uidx')
			.on(table.hospitalId, table.category, table.entityKey)
			.where(sql`${table.deletedAt} IS NULL`),
		index('hospital_color_config_hospital_id_idx').on(table.hospitalId)
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
		counterIncludeFinancialYear: integer(
			'counter_include_financial_year'
		)
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
		unique('prefix_format_hospital_key_unique').on(
			table.hospitalId,
			table.key
		)
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
	branchId: uuid('branch_id').references(
		() => hospitalBranchTable.id,
		{
			onDelete: 'cascade'
		}
	),
	financialYearId: integer('financial_year_id').references(
		() => financialYearTable.id,
		{ onDelete: 'set null' }
	),
	visitTypeId: integer('visit_type_id').references(
		() => visitTypeTable.id,
		{
			onDelete: 'set null'
		}
	),
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
		name: varchar('name', { length: 512 }),
		code: varchar('code', { length: 128 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('hospital_department_hospital_id_idx').on(table.hospitalId),
		index('hospital_department_name_idx').on(table.name),
		index('hospital_department_code_idx').on(table.code),
		index('hospital_department_status_id_idx').on(table.statusId),
		unique('hospital_department_hospital_code_unique').on(
			table.code,
			table.hospitalId
		)
	]
);

export const moduleTable = pgTable('module', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	/** Lucide kebab-case icon name (Menzies Design / Wash DynamicIcon naming). */
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
	hospitalDepartmentId: integer('hospital_department_id')
		.notNull()
		.references(() => hospitalDepartmentTable.id),
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
			t.branchId,
			t.staffId
		)
	]
);

export const staffTable = pgTable('staff', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidV7()),
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

export const userGroupPageTable = pgTable(
	'user_group_page',
	{
		id: serial('id').primaryKey(),
		userGroupId: integer('user_group_id').references(
			() => userGroupTable.id
		),
		pageId: integer('page_id').references(() => pageTable.id),
		/** `page_action` code: view | create | edit | delete | approve | … */
		actionCode: varchar('action_code', { length: 48 })
			.notNull()
			.default(PageActionEnum.VIEW),
		...junctionTimestamps
	},
	(t) => [
		unique('user_group_page_group_page_action_unique').on(
			t.actionCode,
			t.pageId,
			t.userGroupId
		)
	]
);

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
		.$defaultFn(() => uuidV7()),
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
	/**
	 * Walk-in / pharmacy external sale patients (quick register).
	 * Still a real patient with HRN; used to filter clinical queues if needed.
	 */
	isExternal: boolean('is_external').notNull().default(false),
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
		.$defaultFn(() => uuidV7()),
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
	visitId: uuid('visit_id')
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

/** Hospital-scoped print layout presets (margins, header/footer HTML). */
export const hospitalDocumentSettingsTable = pgTable(
	'hospital_document_settings',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }).notNull(),
		documentId: integer('document_id').references(() => documentTable.id, {
			onDelete: 'cascade'
		}),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		marginTop: integer('margin_top').default(20),
		marginBottom: integer('margin_bottom').default(20),
		marginLeft: integer('margin_left').default(15),
		marginRight: integer('margin_right').default(15),
		paddingTop: integer('padding_top').default(10),
		paddingBottom: integer('padding_bottom').default(10),
		paddingLeft: integer('padding_left').default(10),
		paddingRight: integer('padding_right').default(10),
		pageSize: varchar('page_size', { length: 20 }).default('A4'),
		pageOrientation: varchar('page_orientation', {
			length: 20
		}).default('portrait'),
		headerHtml: text('header_html'),
		footerHtml: text('footer_html'),
		showHeader: boolean('show_header').default(true),
		showFooter: boolean('show_footer').default(true),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('hospital_document_settings_name_idx').on(table.name),
		uniqueIndex('hospital_document_settings_document_id_uidx').on(
			table.documentId
		),
		index('hospital_document_settings_hospital_id_idx').on(table.hospitalId),
		index('hospital_document_settings_status_id_idx').on(table.statusId)
	]
);

/** @deprecated use hospitalDocumentSettingsTable */
export const documentSettingTable = hospitalDocumentSettingsTable;

/** Patient document - links documents to visits (clinical document sub page) */
export const patientDocumentTable = pgTable(
	'patient_document',
	{
		id: serial('id').primaryKey(),
		visitId: uuid('visit_id')
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
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidV7()),
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
	/** Set from Observation EMR “Save as signed”; locks visit-scoped clinical edits and sets visit status tagging to Closed. Cleared on unsign (status returns to Seen). */
	clinicalSignedAt: timestamp('clinical_signed_at', {
		withTimezone: true,
		mode: 'string'
	}),
	/** Prior visit this encounter continues from (ADT/ED conversion, etc.). */
	sourceVisitId: uuid('source_visit_id').references(
		(): AnyPgColumn => patientVisitTable.id,
		{ onDelete: 'set null' }
	),
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
	visitId: uuid('visit_id')
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
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		diagnosisTypeId: integer('diagnosis_type_id')
			.notNull()
			.references(() => diagnosisTypeTable.id),
		diagnosisCodeId: integer('diagnosis_code_id').references(
			() => diagnosisCodeTable.id,
			{ onDelete: 'set null' }
		),
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
		visitId: uuid('visit_id')
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
		visitId: uuid('visit_id')
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

/** CPOE prescription free-text notes (multiple per visit; Consultation → CPOE → Prescription). */
export const cpoePrescriptionNoteTable = pgTable(
	'cpoe_prescription_note',
	{
		id: serial('id').primaryKey(),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: uuid('visit_id')
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
		index('cpoe_prescription_note_visit_id_idx').on(table.visitId),
		index('cpoe_prescription_note_patient_id_idx').on(
			table.patientId
		),
		index('cpoe_prescription_note_branch_id_idx').on(table.branchId),
		index('cpoe_prescription_note_status_id_idx').on(table.statusId)
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
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		note: text('note').notNull().default(''),
		subjective: text('subjective'),
		objective: text('objective'),
		assessment: text('assessment'),
		plan: text('plan'),
		deleteRemark: text('delete_remark'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		doctorId: uuid('doctor_id').references(() => staffTable.id),
		cosignedAt: timestamp('cosigned_at', { withTimezone: true }),
		cosignedBy: uuid('cosigned_by').references(() => staffTable.id),
		signedAt: timestamp('signed_at', { withTimezone: true }),
		signedBy: uuid('signed_by').references(() => staffTable.id),
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
		countryId: integer('country_id').references(
			() => countryTable.id
		),
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
		/** Free text; no manufacturer master table. */
		manufacturerName: varchar('manufacturer_name', { length: 512 }),
		pharmacyGenericId: integer('pharmacy_generic_id').references(
			() => pharmacyGenericTable.id,
			{ onDelete: 'restrict' }
		),
		description: text('description'),
		remark: text('remark'),
		/** Optional override for expiring-soon alerts (days before expiry); null uses hospital default. */
		expiryAlertLeadDays: integer('expiry_alert_lead_days'),
		/** Per-item markup applied in the ITEM formula slot at sale time. */
		itemMarkupPercent: decimal('item_markup_percent', {
			precision: 8,
			scale: 2
		})
			.notNull()
			.default('0'),
		/** When true, MO-authored med orders need Consultant cosign before pharmacy dispense. */
		isHighRisk: boolean('is_high_risk').notNull().default(false),
		rxnormRxcui: varchar('rxnorm_rxcui', { length: 16 }),
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
			.references(() => itemUnitMasterTable.id, {
				onDelete: 'restrict'
			}),
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
			.where(sql`${t.deletedAt} IS NULL AND ${t.isDefaultYesNo} = 1`)
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

/**
 * Links hospital billing setup (OP / IP / ER) to existing service_item_tagging rows
 * for auto bill lines when a visit in that care setting is completed.
 */
export const billingSetupServiceTaggingTable = pgTable(
	'billing_setup_service_tagging',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		careSetting: varchar('care_setting', { length: 8 }).notNull(),
		serviceTaggingId: integer('service_tagging_id')
			.notNull()
			.references(() => serviceTaggingTable.id, {
				onDelete: 'cascade'
			}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		uniqueIndex('billing_setup_hospital_care_tagging_uidx').on(
			table.hospitalId,
			table.careSetting,
			table.serviceTaggingId
		),
		index('billing_setup_hospital_care_idx').on(
			table.hospitalId,
			table.careSetting
		)
	]
);

/** Per-hospital billing behavior (visit open vs bill closed). */
export const hospitalBillingSettingTable = pgTable('hospital_billing_setting', {
	hospitalId: uuid('hospital_id')
		.primaryKey()
		.references(() => hospitalTable.id, { onDelete: 'cascade' }),
	/** {@link BillingVisitOpenModeEnum} */
	visitOpenMode: integer('visit_open_mode')
		.notNull()
		.default(BillingVisitOpenModeEnum.ONE_VISIT_ONE_BILL),
	/** Placeholder service item for in-house medication order bill lines (grouping + FK). */
	pharmacyBillingServiceItemId: integer(
		'pharmacy_billing_service_item_id'
	).references(() => serviceItemTable.id, {
		onDelete: 'set null'
	}),
	...timestamps
});

export const serviceOrderTable = pgTable('patient_service_order', {
	id: serial('id').primaryKey(),
	branchId: uuid('branch_id')
		.notNull()
		.references(() => hospitalBranchTable.id, {
			onDelete: 'cascade'
		}),
	orderDate: date('order_date'),
	orderTime: time('order_time'),
	orderNo: varchar('order_no', { length: 128 }),
	visitId: uuid('visit_id')
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
	'patient_service_order_detail',
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
 * closed bill (`status_tagging_id` = CLOSED) freezes its lines; a new open
 * draft appears when there are nursing-complete lines not yet on any closed bill.
 */
export const opBillingTable = pgTable(
	'op_billing',
	{
		id: serial('id').primaryKey(),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, {
				onDelete: 'cascade'
			}),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id, {
				onDelete: 'cascade'
			}),
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
		/** Workflow status (Open / Closed). Closing sets this to CLOSED. */
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id)
			.default(BillingStatusTaggingEnum.OPEN),
		/**
		 * Legacy close audit columns. Open vs closed is `status_tagging_id`
		 * (`BillingStatusTaggingEnum`). New closes do not write these.
		 */
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
		index('op_billing_status_tagging_id_idx').on(table.statusTaggingId),
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
		serviceOrderDetailId: integer(
			'service_order_detail_id'
		).references(() => serviceOrderDetailTable.id, {
			onDelete: 'set null'
		}),
		/** Set when the bill line is sourced from a saved medication (internal) order line. */
		medicationOrderLineId: integer('medication_order_line_id'),
		departmentConsumptionLineId: integer('department_consumption_line_id'),
		serviceId: integer('service_id')
			.notNull()
			.references(() => serviceItemTable.id, {
				onDelete: 'restrict'
			}),
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
		pricingFormulaTemplateId: integer('pricing_formula_template_id'),
		pricingModule: varchar('pricing_module', { length: 16 }),
		pricingBatchId: integer('pricing_batch_id'),
		unitSalePriceIssue: decimal('unit_sale_price_issue', {
			precision: 14,
			scale: 2
		}),
		pricingInputsSnapshot: jsonb('pricing_inputs_snapshot'),
		...timestamps
	},
	(table) => [
		index('op_billing_line_op_billing_id_idx').on(table.opBillingId),
		index('op_billing_line_service_id_idx').on(table.serviceId),
		index('op_billing_line_service_order_detail_id_idx').on(
			table.serviceOrderDetailId
		),
		index('op_billing_line_medication_order_line_id_idx').on(
			table.medicationOrderLineId
		)
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
	/** Per-store markup applied in the STORE formula slot at sale time. */
	storeMarkupPercent: decimal('store_markup_percent', {
		precision: 8,
		scale: 2
	})
		.notNull()
		.default('0'),
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
	visitId: uuid('visit_id')
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

/**
 * Care-tier / pricing category for wards (e.g. General, ICU, HDU).
 * Holds the ward-level markup % used in daily tariff.
 */
export const wardCategoryTable = pgTable(
	'ward_category',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 64 }),
		/**
		 * Care-intensity markup % applied on bed base (after room markup):
		 * daily = base × (1 + room%/100) × (1 + category%/100).
		 */
		wardMarkup: decimal('ward_markup', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		/** When true, category is for Emergency (ED) master data only. */
		isEr: boolean('is_er').notNull().default(false),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('ward_category_hospital_id_idx').on(table.hospitalId),
		index('ward_category_status_id_idx').on(table.statusId)
	]
);

/**
 * Privacy / amenity category for rooms (e.g. Shared, Private, Suite).
 * Holds the room-level markup % used in daily tariff.
 */
export const roomCategoryTable = pgTable(
	'room_category',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 64 }),
		/**
		 * Room markup % applied on bed base before ward-category markup:
		 * daily = base × (1 + room%/100) × (1 + ward%/100).
		 */
		roomMarkup: decimal('room_markup', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		isEr: boolean('is_er').notNull().default(false),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('room_category_hospital_id_idx').on(table.hospitalId),
		index('room_category_status_id_idx').on(table.statusId)
	]
);

/** IPD ward master (Hospital → Branch → Ward → Room → Bed). */
export const wardTable = pgTable(
	'ward',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		/** Ward belongs to a branch. */
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id, {
				onDelete: 'cascade'
			}),
		wardCategoryId: integer('ward_category_id')
			.notNull()
			.references(() => wardCategoryTable.id, {
				onDelete: 'restrict'
			}),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 64 }),
		isEr: boolean('is_er').notNull().default(false),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('ward_hospital_id_idx').on(table.hospitalId),
		index('ward_branch_id_idx').on(table.branchId),
		index('ward_category_id_idx').on(table.wardCategoryId),
		index('ward_status_id_idx').on(table.statusId)
	]
);

/**
 * IPD room master (belongs to ward). A room holds many beds (1:N).
 * Markup % comes from room category.
 */
export const roomTable = pgTable(
	'room',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		wardId: integer('ward_id')
			.notNull()
			.references(() => wardTable.id, { onDelete: 'cascade' }),
		roomCategoryId: integer('room_category_id')
			.notNull()
			.references(() => roomCategoryTable.id, {
				onDelete: 'restrict'
			}),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 64 }),
		/**
		 * Derived bed count for this room (synced when beds are assigned/removed).
		 * Not set manually — capacity = number of non-deleted beds.
		 */
		capacity: integer('capacity').notNull().default(0),
		/** Optional amenity / privacy notes (e.g. Ensuite, Isolation). */
		amenities: text('amenities'),
		isEr: boolean('is_er').notNull().default(false),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('room_hospital_id_idx').on(table.hospitalId),
		index('room_ward_id_idx').on(table.wardId),
		index('room_category_id_idx').on(table.roomCategoryId),
		index('room_status_id_idx').on(table.statusId)
	]
);

/** IPD bed master (belongs to room; ward resolved via room). */
export const bedTable = pgTable(
	'bed',
	{
		id: serial('id').primaryKey(),
		roomId: integer('room_id')
			.notNull()
			.references(() => roomTable.id, { onDelete: 'cascade' }),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 64 }),
		/** Foundational daily bed asset cost in additive tariff. */
		basePrice: decimal('base_price', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		/** Base price unit (Timeline); daily rate = marked-up base ÷ duration. */
		basePriceUnitId: integer('base_price_unit_id').references(
			() => unitTable.id,
			{ onDelete: 'set null' }
		),
		/** {@link IpdBedStatusEnum} */
		bedStatus: integer('bed_status')
			.notNull()
			.default(IpdBedStatusEnum.FREE),
		isEr: boolean('is_er').notNull().default(false),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('bed_room_id_idx').on(table.roomId),
		index('bed_hospital_id_idx').on(table.hospitalId),
		index('bed_bed_status_idx').on(table.bedStatus),
		index('bed_status_id_idx').on(table.statusId)
	]
);

/**
 * IPD admission for a patient visit (created by ADT Admission as a new IPD visit).
 * At most one active (non-cancelled) admission per visit.
 * Current location: ward + room + bed (denormalized for census; bed is source of truth).
 */
export const ipdAdmissionTable = pgTable(
	'ipd_admission',
	{
		id: serial('id').primaryKey(),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, {
				onDelete: 'cascade'
			}),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id, {
				onDelete: 'cascade'
			}),
		admissionNo: varchar('admission_no', { length: 128 }),
		wardId: integer('ward_id')
			.notNull()
			.references(() => wardTable.id, { onDelete: 'restrict' }),
		roomId: integer('room_id')
			.notNull()
			.references(() => roomTable.id, { onDelete: 'restrict' }),
		bedId: integer('bed_id')
			.notNull()
			.references(() => bedTable.id, { onDelete: 'restrict' }),
		admittingDoctorId: uuid('admitting_doctor_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		admittedAt: timestamp('admitted_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		dischargedAt: timestamp('discharged_at', {
			withTimezone: true,
			mode: 'string'
		}),
		reasonNotes: text('reason_notes'),
		/**
		 * Temporary leave (OT / Recovery): bed stays OCCUPIED; not a transfer.
		 * Null when patient is on the assigned bed.
		 */
		otHoldLocation: varchar('ot_hold_location', { length: 256 }),
		otHoldAt: timestamp('ot_hold_at', {
			withTimezone: true,
			mode: 'string'
		}),
		/** {@link IpdAdmissionStatusEnum} */
		admissionStatus: integer('admission_status')
			.notNull()
			.default(IpdAdmissionStatusEnum.ADMITTED),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('ipd_admission_visit_id_idx').on(table.visitId),
		index('ipd_admission_hospital_id_idx').on(table.hospitalId),
		index('ipd_admission_ward_id_idx').on(table.wardId),
		index('ipd_admission_room_id_idx').on(table.roomId),
		index('ipd_admission_bed_id_idx').on(table.bedId),
		index('ipd_admission_admission_status_idx').on(
			table.admissionStatus
		),
		uniqueIndex('ipd_admission_visit_active_uidx')
			.on(table.visitId)
			// Literal `1` (= IpdAdmissionStatusEnum.ADMITTED). Do not use
			// `${enum}` here — drizzle-kit push binds it as `$1` and Neon DDL fails.
			.where(sql`${table.admissionStatus} = 1`)
	]
);

/** Bed assignment / transfer history for an IPD admission. */
export const ipdBedHistoryTable = pgTable(
	'ipd_bed_history',
	{
		id: serial('id').primaryKey(),
		admissionId: integer('admission_id')
			.notNull()
			.references(() => ipdAdmissionTable.id, {
				onDelete: 'cascade'
			}),
		fromBedId: integer('from_bed_id').references(() => bedTable.id, {
			onDelete: 'set null'
		}),
		toBedId: integer('to_bed_id')
			.notNull()
			.references(() => bedTable.id, { onDelete: 'restrict' }),
		fromRoomId: integer('from_room_id').references(
			() => roomTable.id,
			{ onDelete: 'set null' }
		),
		toRoomId: integer('to_room_id')
			.notNull()
			.references(() => roomTable.id, { onDelete: 'restrict' }),
		fromWardId: integer('from_ward_id').references(
			() => wardTable.id,
			{ onDelete: 'set null' }
		),
		toWardId: integer('to_ward_id')
			.notNull()
			.references(() => wardTable.id, { onDelete: 'restrict' }),
		movedAt: timestamp('moved_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		movedByStaffId: uuid('moved_by_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		remark: text('remark'),
		...timestamps
	},
	(table) => [
		index('ipd_bed_history_admission_id_idx').on(table.admissionId),
		index('ipd_bed_history_to_bed_id_idx').on(table.toBedId),
		index('ipd_bed_history_to_room_id_idx').on(table.toRoomId)
	]
);

/**
 * Billable bed-stay segment with immutable price snapshot.
 * Closed on transfer/discharge; new segment opens on admit/transfer.
 */
export const ipdBedStaySegmentTable = pgTable(
	'ipd_bed_stay_segment',
	{
		id: serial('id').primaryKey(),
		admissionId: integer('admission_id')
			.notNull()
			.references(() => ipdAdmissionTable.id, {
				onDelete: 'cascade'
			}),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		wardId: integer('ward_id')
			.notNull()
			.references(() => wardTable.id, { onDelete: 'restrict' }),
		roomId: integer('room_id')
			.notNull()
			.references(() => roomTable.id, { onDelete: 'restrict' }),
		bedId: integer('bed_id')
			.notNull()
			.references(() => bedTable.id, { onDelete: 'restrict' }),
		wardNameSnapshot: varchar('ward_name_snapshot', {
			length: 512
		}),
		roomNameSnapshot: varchar('room_name_snapshot', {
			length: 512
		}),
		bedNameSnapshot: varchar('bed_name_snapshot', { length: 512 }),
		bedBasePriceSnapshot: decimal('bed_base_price_snapshot', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		roomMarkupSnapshot: decimal('room_markup_snapshot', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		wardMarkupSnapshot: decimal('ward_markup_snapshot', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		dailyTariffSnapshot: decimal('daily_tariff_snapshot', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		basePriceUnitIdSnapshot: integer('base_price_unit_id_snapshot'),
		basePriceUnitNameSnapshot: varchar('base_price_unit_name_snapshot', {
			length: 512
		}),
		timelineDurationDaysSnapshot: decimal(
			'timeline_duration_days_snapshot',
			{ precision: 18, scale: 6 }
		),
		startedAt: timestamp('started_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		endedAt: timestamp('ended_at', {
			withTimezone: true,
			mode: 'string'
		}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('ipd_bed_stay_segment_admission_id_idx').on(
			table.admissionId
		),
		index('ipd_bed_stay_segment_hospital_id_idx').on(
			table.hospitalId
		),
		index('ipd_bed_stay_segment_open_idx')
			.on(table.admissionId)
			.where(sql`${table.endedAt} IS NULL`)
	]
);

/**
 * Hospital policy for how stay length converts to accommodation charges.
 * One row per hospital + care setting (IP / ED); upserted on first use.
 */
export const accommodationBillingPolicyTable = pgTable(
	'accommodation_billing_policy',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		/** IP or ED (same policy shape for both care settings). */
		careSetting: varchar('care_setting', { length: 8 })
			.notNull()
			.default('IP'),
		/** Minimum bill block qty (× accommodation bill unit). */
		leastBillDuration: decimal('least_bill_duration', {
			precision: 8,
			scale: 4
		}).default('1'),
		/**
		 * Optional service item used when posting accommodation lines
		 * into ip_billing_line (IP) or ER bed charge (ED).
		 */
		accommodationServiceItemId: integer(
			'accommodation_service_item_id'
		).references(() => serviceItemTable.id, {
			onDelete: 'set null'
		}),
		/** Timeline unit for least-bill block and IP bill line qty/label. */
		accommodationBillUnitId: integer(
			'accommodation_bill_unit_id'
		).references(() => unitTable.id, {
			onDelete: 'set null'
		}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		uniqueIndex('accommodation_billing_policy_hospital_care_uidx').on(
			table.hospitalId,
			table.careSetting
		)
	]
);

/**
 * IP billing header for an IPD visit (mirrors `op_billing`).
 * Multiple drafts/closed bills per visit allowed same as OP; closed is
 * `status_tagging_id` = CLOSED.
 */
export const ipBillingTable = pgTable(
	'ip_billing',
	{
		id: serial('id').primaryKey(),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, {
				onDelete: 'cascade'
			}),
		admissionId: integer('admission_id').references(
			() => ipdAdmissionTable.id,
			{ onDelete: 'set null' }
		),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id, {
				onDelete: 'cascade'
			}),
		billNo: varchar('bill_no', { length: 128 }),
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
		discountPercent: decimal('discount_percent', {
			precision: 5,
			scale: 2
		}),
		discountAmount: decimal('discount_amount', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		totalAmount: decimal('total_amount', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		/** Sum of IP advance deposits applied when the bill is closed. */
		advanceAppliedAmount: decimal('advance_applied_amount', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		/** Net collected at close (typically total − advance). */
		amountPaid: decimal('amount_paid', {
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
		/** Workflow status (Open / Closed). Closing sets this to CLOSED. */
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id)
			.default(BillingStatusTaggingEnum.OPEN),
		/**
		 * Legacy close audit columns. Open vs closed is `status_tagging_id`
		 * (`BillingStatusTaggingEnum`). New closes do not write these.
		 */
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
		index('ip_billing_visit_id_idx').on(table.visitId),
		index('ip_billing_admission_id_idx').on(table.admissionId),
		index('ip_billing_hospital_id_idx').on(table.hospitalId),
		index('ip_billing_branch_id_idx').on(table.branchId),
		index('ip_billing_bill_no_idx').on(table.billNo),
		index('ip_billing_status_id_idx').on(table.statusId),
		index('ip_billing_status_tagging_id_idx').on(table.statusTaggingId)
	]
);

export const ipBillingLineTable = pgTable(
	'ip_billing_line',
	{
		id: serial('id').primaryKey(),
		ipBillingId: integer('ip_billing_id')
			.notNull()
			.references(() => ipBillingTable.id, { onDelete: 'cascade' }),
		lineIndex: integer('line_index').notNull(),
		serviceOrderDetailId: integer(
			'service_order_detail_id'
		).references(() => serviceOrderDetailTable.id, {
			onDelete: 'set null'
		}),
		medicationOrderLineId: integer('medication_order_line_id'),
		serviceId: integer('service_id')
			.notNull()
			.references(() => serviceItemTable.id, {
				onDelete: 'restrict'
			}),
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
		/** Base-price-unit qty; fractional (e.g. 8/24 of a Day). */
		serviceUnit: decimal('service_unit', { precision: 18, scale: 4 }),
		lineTotal: decimal('line_total', {
			precision: 14,
			scale: 2
		}).notNull(),
		pricingFormulaTemplateId: integer('pricing_formula_template_id'),
		pricingModule: varchar('pricing_module', { length: 16 }),
		pricingBatchId: integer('pricing_batch_id'),
		unitSalePriceIssue: decimal('unit_sale_price_issue', {
			precision: 14,
			scale: 2
		}),
		pricingInputsSnapshot: jsonb('pricing_inputs_snapshot'),
		ipdBedStaySegmentId: integer('ipd_bed_stay_segment_id').references(
			() => ipdBedStaySegmentTable.id,
			{ onDelete: 'set null' }
		),
		...timestamps
	},
	(table) => [
		index('ip_billing_line_ip_billing_id_idx').on(table.ipBillingId),
		index('ip_billing_line_ipd_bed_stay_segment_id_idx').on(
			table.ipdBedStaySegmentId
		),
		index('ip_billing_line_service_id_idx').on(table.serviceId),
		index('ip_billing_line_service_order_detail_id_idx').on(
			table.serviceOrderDetailId
		)
	]
);

/** ICD / coding master for visit diagnoses (global; hospital binds via hospital.coding_system). */
export const diagnosisCodeTable = pgTable(
	'diagnosis_code',
	{
		id: serial('id').primaryKey(),
		code: varchar('code', { length: 32 }).notNull(),
		system: varchar('system', { length: 32 })
			.notNull()
			.default('ICD10'),
		description: text('description').notNull(),
		/** WHO release / linearization id used at import time (optional). */
		releaseId: varchar('release_id', { length: 128 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		uniqueIndex('diagnosis_code_system_code_uidx').on(
			t.system,
			t.code
		),
		index('diagnosis_code_status_id_idx').on(t.statusId),
		index('diagnosis_code_system_status_idx').on(t.system, t.statusId)
	]
);

/**
 * Import metadata for WHO ICD catalog loads (one row per system + release).
 * Runtime EMR search uses `diagnosis_code` only; this table is for ops/admin.
 */
export const diagnosisCodeReleaseTable = pgTable(
	'diagnosis_code_release',
	{
		id: serial('id').primaryKey(),
		system: varchar('system', { length: 32 }).notNull(),
		releaseId: varchar('release_id', { length: 128 }).notNull(),
		source: varchar('source', { length: 64 })
			.notNull()
			.default('WHO_ICD_API'),
		titleCount: integer('title_count').notNull().default(0),
		importedAt: timestamp('imported_at', {
			withTimezone: true,
			mode: 'date'
		})
			.notNull()
			.defaultNow(),
		notes: text('notes'),
		...timestamps
	},
	(t) => [
		uniqueIndex('diagnosis_code_release_system_release_uidx').on(
			t.system,
			t.releaseId
		)
	]
);

/** IPD clinical discharge summary (1 per visit). */
export const dischargeSummaryTable = pgTable(
	'discharge_summary',
	{
		id: serial('id').primaryKey(),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, {
				onDelete: 'cascade'
			}),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		hospitalCourse: text('hospital_course').notNull().default(''),
		dischargeMedications: text('discharge_medications')
			.notNull()
			.default(''),
		followUp: text('follow_up').notNull().default(''),
		redFlags: text('red_flags').notNull().default(''),
		draftedBy: uuid('drafted_by').references(() => staffTable.id),
		signedBy: uuid('signed_by').references(() => staffTable.id),
		signedAt: timestamp('signed_at', { withTimezone: true }),
		cosignedAt: timestamp('cosigned_at', { withTimezone: true }),
		cosignedBy: uuid('cosigned_by').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		uniqueIndex('discharge_summary_visit_uidx').on(t.visitId),
		index('discharge_summary_hospital_id_idx').on(t.hospitalId)
	]
);

/** In-app lab result (not external LIS). */
export const labResultTable = pgTable(
	'lab_result',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, {
				onDelete: 'cascade'
			}),
		serviceOrderDetailId: integer(
			'service_order_detail_id'
		).references(() => serviceOrderDetailTable.id, {
			onDelete: 'set null'
		}),
		resultText: text('result_text').notNull().default(''),
		resultJson: text('result_json'),
		isCritical: boolean('is_critical').notNull().default(false),
		enteredBy: uuid('entered_by').references(() => staffTable.id),
		endorsedAt: timestamp('endorsed_at', { withTimezone: true }),
		endorsedBy: uuid('endorsed_by').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('lab_result_visit_id_idx').on(t.visitId),
		index('lab_result_hospital_id_idx').on(t.hospitalId)
	]
);

/** In-app imaging result + attachment URL (not DICOM PACS). */
export const imagingResultTable = pgTable(
	'imaging_result',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, {
				onDelete: 'cascade'
			}),
		serviceOrderDetailId: integer(
			'service_order_detail_id'
		).references(() => serviceOrderDetailTable.id, {
			onDelete: 'set null'
		}),
		findings: text('findings').notNull().default(''),
		attachmentUrl: text('attachment_url'),
		enteredBy: uuid('entered_by').references(() => staffTable.id),
		endorsedAt: timestamp('endorsed_at', { withTimezone: true }),
		endorsedBy: uuid('endorsed_by').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('imaging_result_visit_id_idx').on(t.visitId),
		index('imaging_result_hospital_id_idx').on(t.hospitalId)
	]
);

/** Bedside clinical procedure note. */
export const clinicalProcedureTable = pgTable(
	'clinical_procedure',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, {
				onDelete: 'cascade'
			}),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		procedureType: varchar('procedure_type', {
			length: 256
		}).notNull(),
		notes: text('notes').notNull().default(''),
		performedAt: timestamp('performed_at', { withTimezone: true }),
		doctorId: uuid('doctor_id').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('clinical_procedure_visit_id_idx').on(t.visitId),
		index('clinical_procedure_hospital_id_idx').on(t.hospitalId)
	]
);

/** Operative / OT note. */
export const operativeNoteTable = pgTable(
	'operative_note',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, {
				onDelete: 'cascade'
			}),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		preOp: text('pre_op').notNull().default(''),
		findings: text('findings').notNull().default(''),
		technique: text('technique').notNull().default(''),
		bloodLoss: varchar('blood_loss', { length: 128 }),
		specimens: text('specimens').notNull().default(''),
		postOp: text('post_op').notNull().default(''),
		surgeonId: uuid('surgeon_id').references(() => staffTable.id),
		surgicalCaseId: integer('surgical_case_id'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('operative_note_visit_id_idx').on(t.visitId),
		index('operative_note_hospital_id_idx').on(t.hospitalId)
	]
);

/**
 * ADT bed booking — may be without a registered patient (Appointment-style guest fields).
 * Does not create a visit; convert later via Admission after patient registration.
 */
export const ipdBedBookingTable = pgTable(
	'ipd_bed_booking',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id, {
				onDelete: 'cascade'
			}),
		patientId: uuid('patient_id').references(() => patientTable.id, {
			onDelete: 'set null'
		}),
		patientTitleId: integer('patient_title_id').references(
			() => titleTable.id
		),
		patientName: varchar('patient_name', { length: 512 }),
		patientDateOfBirth: date('patient_date_of_birth'),
		patientAgeYear: integer('patient_age_year'),
		patientAgeMonth: integer('patient_age_month'),
		patientAgeDay: integer('patient_age_day'),
		phone: varchar('phone', { length: 128 }),
		email: varchar('email', { length: 512 }),
		preferredWardId: integer('preferred_ward_id').references(
			() => wardTable.id,
			{ onDelete: 'set null' }
		),
		preferredBedId: integer('preferred_bed_id').references(
			() => bedTable.id,
			{ onDelete: 'set null' }
		),
		expectedAdmitAt: timestamp('expected_admit_at', {
			withTimezone: true,
			mode: 'string'
		}),
		admittingDoctorId: uuid('admitting_doctor_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		remark: text('remark'),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id)
			.default(IpdBedBookingStatusTaggingEnum.BOOKED),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('ipd_bed_booking_hospital_id_idx').on(t.hospitalId),
		index('ipd_bed_booking_branch_id_idx').on(t.branchId),
		index('ipd_bed_booking_patient_id_idx').on(t.patientId),
		index('ipd_bed_booking_status_tagging_id_idx').on(t.statusTaggingId)
	]
);

/**
 * ADT bed transfer requisition — request workflow; complete calls transferBed.
 */
export const ipdBedTransferRequisitionTable = pgTable(
	'ipd_bed_transfer_requisition',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		admissionId: integer('admission_id')
			.notNull()
			.references(() => ipdAdmissionTable.id, {
				onDelete: 'cascade'
			}),
		fromBedId: integer('from_bed_id')
			.notNull()
			.references(() => bedTable.id, { onDelete: 'restrict' }),
		toBedId: integer('to_bed_id').references(() => bedTable.id, {
			onDelete: 'restrict'
		}),
		toWardId: integer('to_ward_id').references(() => wardTable.id, {
			onDelete: 'set null'
		}),
		requestedByStaffId: uuid('requested_by_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		remark: text('remark'),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id)
			.default(IpdBedTransferReqStatusTaggingEnum.DRAFT),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('ipd_bed_xfer_req_hospital_id_idx').on(t.hospitalId),
		index('ipd_bed_xfer_req_admission_id_idx').on(t.admissionId),
		index('ipd_bed_xfer_req_status_tagging_id_idx').on(t.statusTaggingId)
	]
);

/**
 * Doctor-ordered IPD admission (Pending Admissions worklist).
 * Fulfilled via admitVisitToIpd; does not occupy a bed while PENDING.
 */
export const ipdAdmissionOrderTable = pgTable(
	'ipd_admission_order',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id, {
				onDelete: 'cascade'
			}),
		sourceVisitId: uuid('source_visit_id')
			.notNull()
			.references(() => patientVisitTable.id, {
				onDelete: 'cascade'
			}),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id, { onDelete: 'cascade' }),
		orderingDoctorId: uuid('ordering_doctor_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		/** {@link IpdAdmissionCareLevelEnum} */
		careLevel: integer('care_level')
			.notNull()
			.default(IpdAdmissionCareLevelEnum.GENERAL),
		/** {@link IpdAdmissionUrgencyEnum} */
		urgency: integer('urgency')
			.notNull()
			.default(IpdAdmissionUrgencyEnum.ROUTINE),
		preferredWardId: integer('preferred_ward_id').references(
			() => wardTable.id,
			{ onDelete: 'set null' }
		),
		notes: text('notes'),
		admissionId: integer('admission_id').references(
			() => ipdAdmissionTable.id,
			{ onDelete: 'set null' }
		),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id)
			.default(IpdAdmissionOrderStatusTaggingEnum.PENDING),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('ipd_admission_order_hospital_id_idx').on(t.hospitalId),
		index('ipd_admission_order_patient_id_idx').on(t.patientId),
		index('ipd_admission_order_source_visit_id_idx').on(
			t.sourceVisitId
		),
		index('ipd_admission_order_status_tagging_id_idx').on(
			t.statusTaggingId
		),
		uniqueIndex('ipd_admission_order_pending_source_visit_uidx')
			.on(t.sourceVisitId)
			// Literal 68 = IpdAdmissionOrderStatusTaggingEnum.PENDING
			.where(sql`${t.statusTaggingId} = 68`)
	]
);

/** Advance / deposit payments collected against an IPD admission. */
export const ipAdvanceDepositTable = pgTable(
	'ip_advance_deposit',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		admissionId: integer('admission_id')
			.notNull()
			.references(() => ipdAdmissionTable.id, {
				onDelete: 'cascade'
			}),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, {
				onDelete: 'cascade'
			}),
		amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
		paymentMethod: varchar('payment_method', { length: 64 })
			.notNull()
			.default('cash'),
		receiptNo: varchar('receipt_no', { length: 128 }),
		paidAt: timestamp('paid_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		paidByStaffId: uuid('paid_by_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		notes: text('notes'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('ip_advance_deposit_hospital_id_idx').on(t.hospitalId),
		index('ip_advance_deposit_admission_id_idx').on(t.admissionId),
		index('ip_advance_deposit_visit_id_idx').on(t.visitId)
	]
);


// Merged from er-master-table.ts
/** Hospital ED triage acuity master (levels 1-5, color-coded). */
export const edTriageLevelTable = pgTable(
	'ed_triage_level',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		level: integer('level').notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		/** daisyUI badge token: error, warning, info, success, neutral, etc. */
		color: varchar('color', { length: 32 }).notNull().default('neutral'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...masterTimestamps
	},
	(t) => [
		uniqueIndex('ed_triage_level_hospital_level_uidx').on(
			t.hospitalId,
			t.level
		),
		index('ed_triage_level_hospital_id_idx').on(t.hospitalId)
	]
);

/** Per-hospital ER billing defaults (bed charge service). */
export const hospitalEdBillingConfigTable = pgTable(
	'hospital_ed_billing_config',
	{
		hospitalId: uuid('hospital_id')
			.primaryKey()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		erBedServiceItemId: integer('er_bed_service_item_id').references(
			() => serviceItemTable.id,
			{ onDelete: 'set null' }
		),
		...masterTimestamps
	}
);

/** Hospital trauma team activation level (code I/II/III or custom). */
export const hospitalTraumaActivationLevelTable = pgTable(
	'hospital_trauma_activation_level',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 16 }).notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		color: varchar('color', { length: 32 }).notNull().default('error'),
		sortOrder: integer('sort_order').notNull().default(0),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...masterTimestamps
	},
	(t) => [
		uniqueIndex('hospital_trauma_activation_level_hospital_code_uidx').on(
			t.hospitalId,
			t.code
		),
		index('hospital_trauma_activation_level_hospital_id_idx').on(t.hospitalId)
	]
);

export const hospitalTraumaMilestoneTemplateTable = pgTable(
	'hospital_trauma_milestone_template',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 64 }).notNull(),
		label: varchar('label', { length: 512 }).notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...masterTimestamps
	},
	(t) => [
		uniqueIndex('hospital_trauma_milestone_tpl_hospital_code_uidx').on(
			t.hospitalId,
			t.code
		),
		index('hospital_trauma_milestone_tpl_hospital_id_idx').on(t.hospitalId)
	]
);

export const hospitalTraumaTeamRoleTable = pgTable(
	'hospital_trauma_team_role',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 64 }).notNull(),
		label: varchar('label', { length: 512 }).notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...masterTimestamps
	},
	(t) => [
		uniqueIndex('hospital_trauma_team_role_hospital_code_uidx').on(
			t.hospitalId,
			t.code
		),
		index('hospital_trauma_team_role_hospital_id_idx').on(t.hospitalId)
	]
);

// Merged from inventory-transaction-table.ts
const invTimestamps = {
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
		{ onDelete: 'set null', onUpdate: 'cascade' }
	),
	updatedBy: text('updated_by').references(
		(): AnyPgColumn => userTable.id,
		{ onDelete: 'set null', onUpdate: 'cascade' }
	),
	deletedBy: text('deleted_by').references(
		(): AnyPgColumn => userTable.id,
		{ onDelete: 'set null', onUpdate: 'cascade' }
	)
} as const;

const invJunctionTimestamps = {
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

/**
 * Low-stock threshold per store+item (issue-unit quantity).
 * Used for alerts and reporting.
 */
export const invItemReorderLevelTable = pgTable(
	'inv_item_reorder_level',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'cascade' }),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'cascade' }),
		/** Threshold in stock/issue unit. */
		minQty: decimal('min_qty', { precision: 18, scale: 0 })
			.notNull()
			.default('0'),
		/** Purchase/issue conversion row used when entering Min qty in purchase unit (nullable legacy rows). */
		itemUnitMasterId: integer('item_unit_master_id').references(
			() => itemUnitMasterTable.id,
			{ onDelete: 'set null' }
		),
		...invTimestamps
	},
	(t) => [
		uniqueIndex('inv_item_reorder_level_store_item_active_uidx')
			.on(t.hospitalId, t.storeId, t.itemId)
			.where(sql`${t.deletedAt} IS NULL`),
		index('inv_item_reorder_level_store_idx').on(
			t.hospitalId,
			t.storeId
		),
		index('inv_item_reorder_level_item_idx').on(
			t.hospitalId,
			t.itemId
		)
	]
);

/** Hospital-wide stock alert defaults and email toggles (one row per hospital). */
export const invStockAlertSettingTable = pgTable(
	'inv_stock_alert_setting',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.unique()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		defaultExpiringSoonDays: integer('default_expiring_soon_days')
			.notNull()
			.default(30),
		emailLowStock: boolean('email_low_stock')
			.notNull()
			.default(false),
		emailExpired: boolean('email_expired').notNull().default(false),
		emailExpiringSoon: boolean('email_expiring_soon')
			.notNull()
			.default(false),
		emailMinGapMinutes: integer('email_min_gap_minutes')
			.notNull()
			.default(360),
		inAppMinGapMinutes: integer('in_app_min_gap_minutes')
			.notNull()
			.default(360),
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
	},
	(t) => [
		index('inv_stock_alert_setting_hospital_idx').on(t.hospitalId)
	]
);

/** Reusable sale-price formula (hospital template library). */
export const invPricingFormulaTemplateTable = pgTable(
	'inv_pricing_formula_template',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 128 }).notNull(),
		description: text('description'),
		formulaVersion: integer('formula_version').notNull().default(1),
		includeDiscount: boolean('include_discount').notNull().default(true),
		includeTax: boolean('include_tax').notNull().default(true),
		includeFreeQty: boolean('include_free_qty').notNull().default(false),
		/** When true, apply item master markup in the ITEM slot. */
		includeItemMarkup: boolean('include_item_markup').notNull().default(true),
		/** When true, apply store markup in the STORE slot. */
		includeStoreMarkup: boolean('include_store_markup').notNull().default(true),
		/** More Sale Less markup (MSL slot). */
		mslMarkupPercent: decimal('msl_markup_percent', {
			precision: 8,
			scale: 2
		})
			.notNull()
			.default('0'),
		slotOrder: jsonb('slot_order')
			.notNull()
			.default(['COST', 'MSL', 'ITEM', 'STORE']),
		isSystemDefault: boolean('is_system_default')
			.notNull()
			.default(false),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
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
	},
	(t) => [
		uniqueIndex('inv_pricing_formula_template_hospital_name_uidx').on(
			t.hospitalId,
			t.name
		),
		uniqueIndex('inv_pricing_formula_template_hospital_default_uidx')
			.on(t.hospitalId)
			.where(sql`${t.isSystemDefault} = true`),
		index('inv_pricing_formula_template_hospital_idx').on(t.hospitalId)
	]
);

/** One assigned template per hospital + branch + sale module. */
export const invModulePricingAssignmentTable = pgTable(
	'inv_module_pricing_assignment',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id, {
				onDelete: 'cascade'
			}),
		/** `IS` | `ES` | `DC` */
		module: varchar('module', { length: 16 }).notNull(),
		formulaTemplateId: integer('formula_template_id')
			.notNull()
			.references(() => invPricingFormulaTemplateTable.id, {
				onDelete: 'restrict'
			}),
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
	},
	(t) => [
		uniqueIndex('inv_module_pricing_assignment_scope_uidx').on(
			t.hospitalId,
			t.branchId,
			t.module
		),
		index('inv_module_pricing_assignment_hospital_idx').on(
			t.hospitalId
		),
		index('inv_module_pricing_assignment_template_idx').on(
			t.formulaTemplateId
		),
		check(
			'inv_module_pricing_assignment_module_chk',
			sql`(${t.module}) IN ('IS', 'ES', 'DC')`
		)
	]
);

/** Staff subscribed to inventory stock alerts per hospital and store. */
export const invStockAlertRecipientTable = pgTable(
	'inv_stock_alert_recipient',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'cascade' }),
		staffId: uuid('staff_id')
			.notNull()
			.references(() => staffTable.id, { onDelete: 'cascade' }),
		notifyLowStock: boolean('notify_low_stock')
			.notNull()
			.default(true),
		notifyExpired: boolean('notify_expired').notNull().default(true),
		notifyExpiringSoon: boolean('notify_expiring_soon')
			.notNull()
			.default(true),
		...invTimestamps
	},
	(t) => [
		uniqueIndex('inv_stock_alert_recipient_hospital_store_staff_uidx')
			.on(t.hospitalId, t.storeId, t.staffId)
			.where(sql`${t.deletedAt} IS NULL`),
		index('inv_stock_alert_recipient_hospital_idx').on(t.hospitalId),
		index('inv_stock_alert_recipient_store_idx').on(
			t.hospitalId,
			t.storeId
		)
	]
);

/** Dedupe log for outbound stock alert emails (per recipient + store + event type). */
export const invStockAlertEmailSentTable = pgTable(
	'inv_stock_alert_email_sent',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'cascade' }),
		recipientStaffId: uuid('recipient_staff_id')
			.notNull()
			.references(() => staffTable.id, { onDelete: 'cascade' }),
		eventType: varchar('event_type', { length: 64 }).notNull(),
		/** Hash of plain-text body; null = legacy rows (time-only cooldown). */
		payloadDigest: varchar('payload_digest', { length: 32 }),
		sentAt: timestamp('sent_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [
		index('inv_stock_alert_email_sent_lookup_idx').on(
			t.hospitalId,
			t.recipientStaffId,
			t.storeId,
			t.eventType,
			t.sentAt
		)
	]
);

/** Per-store PR/PO approval levels (many staff per level via inv_approval_assignee). */
export const invApprovalLevelTable = pgTable(
	'inv_approval_level',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'cascade' }),
		/** `PR` | `PO` | `DI` | `SI` | `SR` | `GRN` | `DC` */
		module: varchar('module', { length: 8 }).notNull(),
		level: integer('level').notNull(),
		isRequired: boolean('is_required').notNull().default(true),
		...invTimestamps
	},
	(t) => [
		uniqueIndex('inv_approval_level_store_module_level_active_uidx')
			.on(t.hospitalId, t.storeId, t.module, t.level)
			.where(sql`${t.deletedAt} IS NULL`),
		index('inv_approval_level_hospital_store_idx').on(
			t.hospitalId,
			t.storeId
		),
		check(
			'inv_approval_level_module_chk',
			sql`${t.module} IN ('PR', 'PO', 'DI', 'DISS', 'RFS', 'GRN', 'DC')`
		),
		check(
			'inv_approval_level_level_positive_chk',
			sql`${t.level} >= 1`
		)
	]
);

export const invApprovalAssigneeTable = pgTable(
	'inv_approval_assignee',
	{
		id: serial('id').primaryKey(),
		levelId: integer('level_id')
			.notNull()
			.references(() => invApprovalLevelTable.id, {
				onDelete: 'cascade'
			}),
		staffId: uuid('staff_id')
			.notNull()
			.references(() => staffTable.id, { onDelete: 'cascade' }),
		...invJunctionTimestamps
	},
	(t) => [
		uniqueIndex('inv_approval_assignee_level_staff_uidx').on(
			t.levelId,
			t.staffId
		)
	]
);

/** Audit trail for PR/PO approvals. */
export const invApprovalLogTable = pgTable(
	'inv_approval_log',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		documentId: uuid('document_id').notNull(),
		module: varchar('module', { length: 8 }).notNull(),
		level: integer('level').notNull(),
		/** {@link InvApprovalActionEnum} */
		action: integer('action').notNull(),
		remarks: text('remarks'),
		approvedBy: text('approved_by')
			.notNull()
			.references(() => userTable.id, { onDelete: 'restrict' }),
		lineAdjustments: jsonb('line_adjustments'),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [
		index('inv_approval_log_document_idx').on(t.documentId),
		check(
			'inv_approval_log_module_chk',
			sql`${t.module} IN ('PR', 'PO', 'DI', 'DISS', 'RFS', 'GRN', 'DC')`
		)
	]
);

export const purchaseRequisitionTable = pgTable(
	'purchase_requisition',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidV7()),
		prNo: varchar('pr_no', { length: 128 }),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		fromStoreId: integer('from_store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		toStoreId: integer('to_store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		requestedBy: text('requested_by')
			.notNull()
			.references(() => userTable.id, { onDelete: 'restrict' }),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id, {
				onDelete: 'restrict'
			}),
		currentLevel: integer('current_level').notNull().default(1),
		remarks: text('remarks'),
		approvedBy: text('approved_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		approvedAt: timestamp('approved_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelledBy: text('cancelled_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		cancelledAt: timestamp('cancelled_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelReason: text('cancel_reason'),
		...invTimestamps
	},
	(t) => [
		index('purchase_requisition_hospital_from_store_idx').on(
			t.hospitalId,
			t.fromStoreId
		),
		index('purchase_requisition_hospital_to_store_idx').on(
			t.hospitalId,
			t.toStoreId
		)
	]
);

export const purchaseRequisitionLineTable = pgTable(
	'purchase_requisition_line',
	{
		id: serial('id').primaryKey(),
		prId: uuid('pr_id')
			.notNull()
			.references(() => purchaseRequisitionTable.id, {
				onDelete: 'cascade'
			}),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		quantity: decimal('quantity', {
			precision: 18,
			scale: 0
		}).notNull(),
		/** Original requested qty; unchanged when approver adjusts `quantity`. */
		requestedQuantity: decimal('requested_quantity', {
			precision: 18,
			scale: 0
		}).notNull(),
		unitId: integer('unit_id')
			.notNull()
			.references(() => unitTable.id, { onDelete: 'restrict' }),
		/** Remaining qty allocatable to POs (starts equal to quantity). */
		qtyRemaining: decimal('qty_remaining', {
			precision: 18,
			scale: 0
		})
			.notNull()
			.default('0'),
		...invTimestamps
	},
	(t) => [index('purchase_requisition_line_pr_id_idx').on(t.prId)]
);

export const purchaseOrderTable = pgTable(
	'purchase_order',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidV7()),
		poNo: varchar('po_no', { length: 128 }),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		/** Null for manual PO (no PR). */
		prId: uuid('pr_id').references(
			() => purchaseRequisitionTable.id,
			{ onDelete: 'restrict' }
		),
		/** For PR-backed PO: same as PR `to_store_id` (central purchasing). PO approval/GRN receive at this store. Manual PO: typically CPS. */
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		supplierId: integer('supplier_id')
			.notNull()
			.references(() => supplierTable.id, { onDelete: 'restrict' }),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id, {
				onDelete: 'restrict'
			}),
		currentLevel: integer('current_level').notNull().default(1),
		totalAmount: decimal('total_amount', { precision: 14, scale: 2 })
			.notNull()
			.default('0'),
		sentToSupplierAt: timestamp('sent_to_supplier_at', {
			withTimezone: true,
			mode: 'string'
		}),
		approvedBy: text('approved_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		approvedAt: timestamp('approved_at', {
			withTimezone: true,
			mode: 'string'
		}),
		...invTimestamps
	},
	(t) => [
		index('purchase_order_hospital_pr_idx').on(t.hospitalId, t.prId),
		index('purchase_order_hospital_store_idx').on(
			t.hospitalId,
			t.storeId
		)
	]
);

export const purchaseOrderLineTable = pgTable(
	'purchase_order_line',
	{
		id: serial('id').primaryKey(),
		poId: uuid('po_id')
			.notNull()
			.references(() => purchaseOrderTable.id, {
				onDelete: 'cascade'
			}),
		prLineId: integer('pr_line_id').references(
			() => purchaseRequisitionLineTable.id,
			{ onDelete: 'set null' }
		),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		quantity: decimal('quantity', {
			precision: 18,
			scale: 0
		}).notNull(),
		unitId: integer('unit_id')
			.notNull()
			.references(() => unitTable.id, { onDelete: 'restrict' }),
		unitPrice: decimal('unit_price', {
			precision: 14,
			scale: 2
		}).notNull(),
		lineTotal: decimal('line_total', {
			precision: 14,
			scale: 2
		}).notNull(),
		qtyReceivedCumulative: decimal('qty_received_cumulative', {
			precision: 18,
			scale: 0
		})
			.notNull()
			.default('0'),
		...invTimestamps
	},
	(t) => [index('purchase_order_line_po_id_idx').on(t.poId)]
);

/**
 * Normalized batch master (cost lot per `goods_receipt_line` when received via GRN).
 * GRN-linked identity: `item_batch_identity_grn_uidx` on
 * `(hospital_id, item_id, batch_no, expiry_date, goods_receipt_line_id)` (migration 0092).
 * Legacy rows use `item_batch_identity_legacy_uidx` (supplier only; migration 0093).
 * Unit prices are read from `goods_receipt_line.purchase_price` at display/sale time.
 */
export const itemBatchTable = pgTable(
	'item_batch',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		batchNo: varchar('batch_no', { length: 128 }).notNull(),
		expiryDate: date('expiry_date'),
		supplierId: integer('supplier_id').references(
			() => supplierTable.id,
			{
				onDelete: 'set null'
			}
		),
		goodsReceiptNoteId: uuid('goods_receipt_note_id').references(
			(): AnyPgColumn => goodsReceiptNoteTable.id,
			{ onDelete: 'set null' }
		),
		goodsReceiptLineId: integer('goods_receipt_line_id').references(
			(): AnyPgColumn => goodsReceiptLineTable.id,
			{ onDelete: 'set null' }
		),
		udiDi: varchar('udi_di', { length: 128 }),
		serialNo: varchar('serial_no', { length: 128 }),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [
		index('item_batch_hospital_item_idx').on(t.hospitalId, t.itemId),
		index('item_batch_expiry_idx').on(t.expiryDate),
		index('item_batch_grn_line_idx').on(t.goodsReceiptLineId),
		index('item_batch_grn_note_idx').on(t.goodsReceiptNoteId)
	]
);

/** Per-store quantity by batch (`item_batch`). */
export const invStockTable = pgTable(
	'inv_stock',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'cascade' }),
		batchId: integer('batch_id')
			.notNull()
			.references(() => itemBatchTable.id, { onDelete: 'restrict' }),
		quantity: decimal('quantity', {
			precision: 18,
			scale: 0
		}).notNull(),
		...invTimestamps
	},
	(t) => [
		index('inv_stock_store_item_idx').on(t.storeId, t.itemId),
		index('inv_stock_batch_idx').on(t.batchId)
	]
);

export const goodsReceiptNoteTable = pgTable(
	'goods_receipt_note',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidV7()),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		/** Null when direct GRN (no PO). */
		poId: uuid('po_id').references(() => purchaseOrderTable.id, {
			onDelete: 'restrict'
		}),
		/** Set when `poId` is null; otherwise may mirror PO supplier. */
		supplierId: integer('supplier_id').references(
			() => supplierTable.id,
			{
				onDelete: 'restrict'
			}
		),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		/**
		 * Supplier invoice metadata (optional).
		 * Stored at GRN header-level (not per line).
		 */
		invoiceNo: varchar('invoice_no', { length: 128 }),
		invoiceDate: date('invoice_date'),
		invoiceAmount: decimal('invoice_amount', {
			precision: 14,
			scale: 2
		}),
		invoiceDiscountAmount: decimal('invoice_discount_amount', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		invoiceDiscountPercent: decimal('invoice_discount_percent', {
			precision: 8,
			scale: 2
		})
			.notNull()
			.default('0'),
		invoiceTaxAmount: decimal('invoice_tax_amount', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		invoiceTaxPercent: decimal('invoice_tax_percent', {
			precision: 8,
			scale: 2
		})
			.notNull()
			.default('0'),
		invoicePhotoUrl: text('invoice_photo_url'),
		receivedBy: text('received_by')
			.notNull()
			.references(() => userTable.id, { onDelete: 'restrict' }),
		receivedDate: date('received_date').notNull(),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id, {
				onDelete: 'restrict'
			}),
		cancelledBy: text('cancelled_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		cancelledAt: timestamp('cancelled_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelReason: text('cancel_reason'),
		...invTimestamps
	},
	(t) => [
		index('goods_receipt_note_po_id_idx').on(t.poId),
		check(
			'goods_receipt_note_po_or_supplier_chk',
			sql`${t.poId} is not null or ${t.supplierId} is not null`
		)
	]
);

export const goodsReceiptLineTable = pgTable(
	'goods_receipt_line',
	{
		id: serial('id').primaryKey(),
		grnId: uuid('grn_id')
			.notNull()
			.references(() => goodsReceiptNoteTable.id, {
				onDelete: 'cascade'
			}),
		/** Null for direct GRN line (no PO line). */
		poLineId: integer('po_line_id').references(
			() => purchaseOrderLineTable.id,
			{ onDelete: 'restrict' }
		),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		purchasedQty: decimal('purchased_qty', {
			precision: 18,
			scale: 0
		}).notNull(),
		batchNo: varchar('batch_no', { length: 128 }),
		expiryDate: date('expiry_date'),
		unitId: integer('unit_id')
			.notNull()
			.references(() => unitTable.id, { onDelete: 'restrict' }),
		batchId: integer('batch_id').references(() => itemBatchTable.id, {
			onDelete: 'set null'
		}),
		purchasePrice: decimal('purchase_price', {
			precision: 14,
			scale: 2
		}),
		freeQty: decimal('free_qty', { precision: 18, scale: 0 })
			.notNull()
			.default('0'),
		/** Unit for `freeQty` (can differ from ordered/received unit). */
		freeUnitId: integer('free_unit_id').references(
			() => unitTable.id,
			{
				onDelete: 'restrict'
			}
		),
		discountAmount: decimal('discount_amount', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		discountPercent: decimal('discount_percent', {
			precision: 8,
			scale: 2
		})
			.notNull()
			.default('0'),
		taxAmount: decimal('tax_amount', { precision: 14, scale: 2 })
			.notNull()
			.default('0'),
		taxPercent: decimal('tax_percent', { precision: 8, scale: 2 })
			.notNull()
			.default('0'),
		...invTimestamps
	},
	(t) => [index('goods_receipt_line_grn_id_idx').on(t.grnId)]
);

export const invStoreTransferTable = pgTable(
	'inv_store_transfer',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidV7()),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		fromStoreId: integer('from_store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		toStoreId: integer('to_store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id, {
				onDelete: 'restrict'
			}),
		requestedBy: text('requested_by')
			.notNull()
			.references(() => userTable.id, { onDelete: 'restrict' }),
		approvedBy: text('approved_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		postedAt: timestamp('posted_at', {
			withTimezone: true,
			mode: 'string'
		}),
		remark: text('remark'),
		/** When set, transfer was created to fulfill a posted GRN (e.g. to requesting store). */
		sourceGrnId: uuid('source_grn_id').references(
			() => goodsReceiptNoteTable.id,
			{ onDelete: 'set null' }
		),
		cancelledBy: text('cancelled_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		cancelledAt: timestamp('cancelled_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelReason: text('cancel_reason'),
		...invTimestamps
	},
	(t) => [
		check(
			'inv_store_transfer_stores_distinct_chk',
			sql`${t.fromStoreId} <> ${t.toStoreId}`
		)
	]
);

export const invStoreTransferLineTable = pgTable(
	'inv_store_transfer_line',
	{
		id: serial('id').primaryKey(),
		transferId: uuid('transfer_id')
			.notNull()
			.references(() => invStoreTransferTable.id, {
				onDelete: 'cascade'
			}),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		quantity: decimal('quantity', {
			precision: 18,
			scale: 0
		}).notNull(),
		unitId: integer('unit_id')
			.notNull()
			.references(() => unitTable.id, { onDelete: 'restrict' }),
		batchId: integer('batch_id')
			.notNull()
			.references(() => itemBatchTable.id, { onDelete: 'restrict' }),
		...invTimestamps
	},
	(t) => [
		index('inv_store_transfer_line_transfer_id_idx').on(t.transferId)
	]
);

export const invStockIssueTable = pgTable(
	'inv_stock_issue',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidV7()),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id, {
				onDelete: 'restrict'
			}),
		issuedTo: text('issued_to'),
		reason: text('reason'),
		postedAt: timestamp('posted_at', {
			withTimezone: true,
			mode: 'string'
		}),
		requestedBy: text('requested_by')
			.notNull()
			.references(() => userTable.id, { onDelete: 'restrict' }),
		cancelledBy: text('cancelled_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		cancelledAt: timestamp('cancelled_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelReason: text('cancel_reason'),
		...invTimestamps
	},
	(t) => [index('inv_stock_issue_store_idx').on(t.storeId)]
);

export const invStockIssueLineTable = pgTable(
	'inv_stock_issue_line',
	{
		id: serial('id').primaryKey(),
		issueId: uuid('issue_id')
			.notNull()
			.references(() => invStockIssueTable.id, {
				onDelete: 'cascade'
			}),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		qty: decimal('qty', { precision: 18, scale: 0 }).notNull(),
		unitId: integer('unit_id')
			.notNull()
			.references(() => unitTable.id, { onDelete: 'restrict' }),
		batchId: integer('batch_id')
			.notNull()
			.references(() => itemBatchTable.id, { onDelete: 'restrict' }),
		...invTimestamps
	},
	(t) => [index('inv_stock_issue_line_issue_id_idx').on(t.issueId)]
);

/** Department indent: requesting store → central store; then central issues, destination receives. */
export const invDepartmentIndentTable = pgTable(
	'inv_department_indent',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidV7()),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		indentNo: varchar('indent_no', { length: 128 }),
		fromStoreId: integer('from_store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		toStoreId: integer('to_store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		requestedBy: text('requested_by')
			.notNull()
			.references(() => userTable.id, { onDelete: 'restrict' }),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id, {
				onDelete: 'restrict'
			}),
		currentLevel: integer('current_level').notNull().default(1),
		remarks: text('remarks'),
		fromApprovedBy: text('from_approved_by').references(
			() => userTable.id,
			{ onDelete: 'set null' }
		),
		fromApprovedAt: timestamp('from_approved_at', {
			withTimezone: true,
			mode: 'string'
		}),
		issuedBy: text('issued_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		issuedAt: timestamp('issued_at', {
			withTimezone: true,
			mode: 'string'
		}),
		receivedBy: text('received_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		receivedAt: timestamp('received_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelledBy: text('cancelled_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		cancelledAt: timestamp('cancelled_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelReason: text('cancel_reason'),
		...invTimestamps
	},
	(t) => [
		index('inv_department_indent_hospital_from_idx').on(
			t.hospitalId,
			t.fromStoreId
		),
		index('inv_department_indent_hospital_to_idx').on(
			t.hospitalId,
			t.toStoreId
		),
		check(
			'inv_department_indent_from_to_distinct_chk',
			sql`${t.fromStoreId} <> ${t.toStoreId}`
		)
	]
);

export const invDepartmentIndentLineTable = pgTable(
	'inv_department_indent_line',
	{
		id: serial('id').primaryKey(),
		indentId: uuid('indent_id')
			.notNull()
			.references(() => invDepartmentIndentTable.id, {
				onDelete: 'cascade'
			}),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		quantity: decimal('quantity', {
			precision: 18,
			scale: 0
		}).notNull(),
		unitId: integer('unit_id')
			.notNull()
			.references(() => unitTable.id, { onDelete: 'restrict' }),
		qtyIssued: decimal('qty_issued', { precision: 18, scale: 0 })
			.notNull()
			.default('0'),
		batchId: integer('batch_id').references(() => itemBatchTable.id, {
			onDelete: 'set null'
		}),
		...invTimestamps
	},
	(t) => [
		index('inv_department_indent_line_indent_id_idx').on(t.indentId)
	]
);

export const invDepartmentIndentLineAllocTable = pgTable(
	'inv_department_indent_line_alloc',
	{
		id: serial('id').primaryKey(),
		lineId: integer('line_id')
			.notNull()
			.references(() => invDepartmentIndentLineTable.id, {
				onDelete: 'cascade'
			}),
		batchId: integer('batch_id')
			.notNull()
			.references(() => itemBatchTable.id, { onDelete: 'restrict' }),
		quantity: decimal('quantity', {
			precision: 18,
			scale: 0
		}).notNull(),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [
		index('inv_department_indent_line_alloc_line_idx').on(t.lineId)
	]
);

/** Department issue: central → requesting store; approval + issue + receive. */
export const invDepartmentIssueTable = pgTable(
	'inv_department_issue',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidV7()),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		issueNo: varchar('issue_no', { length: 128 }),
		sourceIndentId: uuid('source_indent_id').references(
			() => invDepartmentIndentTable.id,
			{ onDelete: 'set null' }
		),
		fromStoreId: integer('from_store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		toStoreId: integer('to_store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		requestedBy: text('requested_by')
			.notNull()
			.references(() => userTable.id, { onDelete: 'restrict' }),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id, {
				onDelete: 'restrict'
			}),
		currentLevel: integer('current_level').notNull().default(1),
		remarks: text('remarks'),
		approvedBy: text('approved_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		approvedAt: timestamp('approved_at', {
			withTimezone: true,
			mode: 'string'
		}),
		issuedBy: text('issued_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		issuedAt: timestamp('issued_at', {
			withTimezone: true,
			mode: 'string'
		}),
		receivedBy: text('received_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		receivedAt: timestamp('received_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelledBy: text('cancelled_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		cancelledAt: timestamp('cancelled_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelReason: text('cancel_reason'),
		...invTimestamps
	},
	(t) => [
		check(
			'inv_department_issue_stores_distinct_chk',
			sql`${t.fromStoreId} <> ${t.toStoreId}`
		),
		index('inv_department_issue_hospital_from_idx').on(
			t.hospitalId,
			t.fromStoreId
		),
		index('inv_department_issue_hospital_to_idx').on(
			t.hospitalId,
			t.toStoreId
		),
		index('inv_department_issue_status_idx').on(t.statusTaggingId),
		index('inv_department_issue_source_indent_idx').on(
			t.sourceIndentId
		)
	]
);

export const invDepartmentIssueLineTable = pgTable(
	'inv_department_issue_line',
	{
		id: serial('id').primaryKey(),
		issueId: uuid('issue_id')
			.notNull()
			.references(() => invDepartmentIssueTable.id, {
				onDelete: 'cascade'
			}),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		quantity: decimal('quantity', {
			precision: 18,
			scale: 0
		}).notNull(),
		unitId: integer('unit_id')
			.notNull()
			.references(() => unitTable.id, { onDelete: 'restrict' }),
		qtyIssued: decimal('qty_issued', { precision: 18, scale: 0 })
			.notNull()
			.default('0'),
		...invTimestamps
	},
	(t) => [
		index('inv_department_issue_line_issue_id_idx').on(t.issueId)
	]
);

export const invDepartmentIssueLineAllocTable = pgTable(
	'inv_department_issue_line_alloc',
	{
		id: serial('id').primaryKey(),
		lineId: integer('line_id')
			.notNull()
			.references(() => invDepartmentIssueLineTable.id, {
				onDelete: 'cascade'
			}),
		batchId: integer('batch_id')
			.notNull()
			.references(() => itemBatchTable.id, { onDelete: 'restrict' }),
		quantity: decimal('quantity', {
			precision: 18,
			scale: 0
		}).notNull(),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [
		index('inv_department_issue_line_alloc_line_idx').on(t.lineId)
	]
);

/** Department consumption: deduct stock at a store after multi-level approval (module DC). */
export const invDepartmentConsumptionTable = pgTable(
	'inv_department_consumption',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidV7()),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		consumptionNo: varchar('consumption_no', { length: 128 }),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		requestedBy: text('requested_by')
			.notNull()
			.references(() => userTable.id, { onDelete: 'restrict' }),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id, {
				onDelete: 'restrict'
			}),
		currentLevel: integer('current_level').notNull().default(1),
		remarks: text('remarks'),
		approvedBy: text('approved_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		approvedAt: timestamp('approved_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelledBy: text('cancelled_by').references(() => userTable.id, {
			onDelete: 'set null'
		}),
		cancelledAt: timestamp('cancelled_at', {
			withTimezone: true,
			mode: 'string'
		}),
		cancelReason: text('cancel_reason'),
		...invTimestamps
	},
	(t) => [
		index('inv_department_consumption_hospital_store_idx').on(
			t.hospitalId,
			t.storeId
		),
		index('inv_department_consumption_status_idx').on(
			t.statusTaggingId
		)
	]
);

export const invDepartmentConsumptionLineTable = pgTable(
	'inv_department_consumption_line',
	{
		id: serial('id').primaryKey(),
		consumptionId: uuid('consumption_id')
			.notNull()
			.references(() => invDepartmentConsumptionTable.id, {
				onDelete: 'cascade'
			}),
		itemId: integer('item_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		quantity: decimal('quantity', {
			precision: 18,
			scale: 0
		}).notNull(),
		unitId: integer('unit_id')
			.notNull()
			.references(() => unitTable.id, { onDelete: 'restrict' }),
		batchId: integer('batch_id')
			.notNull()
			.references(() => itemBatchTable.id, { onDelete: 'restrict' }),
		/** Per issue unit; snapshot at post time. */
		empSalePrice: decimal('emp_sale_price', {
			precision: 14,
			scale: 2
		}),
		pricingFormulaTemplateId: integer(
			'pricing_formula_template_id'
		).references(() => invPricingFormulaTemplateTable.id, {
			onDelete: 'restrict'
		}),
		pricingModule: varchar('pricing_module', { length: 16 }),
		unitEmpSalePriceIssue: decimal('unit_emp_sale_price_issue', {
			precision: 14,
			scale: 2
		}),
		pricingInputsSnapshot: jsonb('pricing_inputs_snapshot'),
		pricingComputedAt: timestamp('pricing_computed_at', {
			withTimezone: true,
			mode: 'string'
		}),
		remarks: text('remarks'),
		...invTimestamps
	},
	(t) => [
		index('inv_department_consumption_line_consumption_id_idx').on(
			t.consumptionId
		),
		index('inv_department_consumption_line_pricing_formula_template_id_idx').on(
			t.pricingFormulaTemplateId
		)
	]
);

// Merged from rxnorm-table.ts
const rxTimestamps = {
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

export const rxnormReleaseTable = pgTable(
	'rxnorm_release',
	{
		id: serial('id').primaryKey(),
		releaseId: varchar('release_id', { length: 128 }).notNull(),
		source: varchar('source', { length: 64 })
			.notNull()
			.default('NLM_RXNORM_FULL'),
		conceptCount: integer('concept_count').notNull().default(0),
		relCount: integer('rel_count').notNull().default(0),
		importedAt: timestamp('imported_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		notes: text('notes'),
		...rxTimestamps
	},
	(t) => [
		uniqueIndex('rxnorm_release_source_release_uidx').on(
			t.source,
			t.releaseId
		)
	]
);

export const rxnormConceptTable = pgTable(
	'rxnorm_concept',
	{
		rxcui: varchar('rxcui', { length: 16 }).primaryKey(),
		name: varchar('name', { length: 1024 }).notNull(),
		tty: varchar('tty', { length: 8 }).notNull(),
		suppress: varchar('suppress', { length: 8 }),
		normalizedName: varchar('normalized_name', { length: 1024 }),
		releaseId: varchar('release_id', { length: 128 }).notNull(),
		...rxTimestamps
	},
	(t) => [
		index('rxnorm_concept_tty_idx').on(t.tty),
		index('rxnorm_concept_name_idx').on(t.normalizedName),
		index('rxnorm_concept_release_idx').on(t.releaseId)
	]
);

export const rxnormRelTable = pgTable(
	'rxnorm_rel',
	{
		id: serial('id').primaryKey(),
		rxcui1: varchar('rxcui1', { length: 16 }).notNull(),
		rxcui2: varchar('rxcui2', { length: 16 }).notNull(),
		rela: varchar('rela', { length: 64 }).notNull(),
		releaseId: varchar('release_id', { length: 128 }).notNull()
	},
	(t) => [
		index('rxnorm_rel_rxcui1_idx').on(t.rxcui1),
		index('rxnorm_rel_rxcui2_idx').on(t.rxcui2),
		index('rxnorm_rel_rela_idx').on(t.rela),
		uniqueIndex('rxnorm_rel_pair_rela_release_uidx').on(
			t.rxcui1,
			t.rxcui2,
			t.rela,
			t.releaseId
		)
	]
);

export const rxnormNdcTable = pgTable(
	'rxnorm_ndc',
	{
		id: serial('id').primaryKey(),
		rxcui: varchar('rxcui', { length: 16 }).notNull(),
		ndc: varchar('ndc', { length: 32 }).notNull(),
		releaseId: varchar('release_id', { length: 128 }).notNull()
	},
	(t) => [
		uniqueIndex('rxnorm_ndc_ndc_release_uidx').on(t.ndc, t.releaseId),
		index('rxnorm_ndc_rxcui_idx').on(t.rxcui)
	]
);

export const drugInteractionTable = pgTable(
	'drug_interaction',
	{
		id: serial('id').primaryKey(),
		source: varchar('source', { length: 32 }).notNull(),
		externalId: varchar('external_id', { length: 128 }).notNull(),
		rxcuiA: varchar('rxcui_a', { length: 16 }),
		rxcuiB: varchar('rxcui_b', { length: 16 }),
		ingredientRxcuiA: varchar('ingredient_rxcui_a', { length: 16 }),
		ingredientRxcuiB: varchar('ingredient_rxcui_b', { length: 16 }),
		severity: varchar('severity', { length: 16 }).notNull(),
		description: text('description').notNull(),
		management: text('management'),
		releaseOrVersion: varchar('release_or_version', { length: 128 }),
		...rxTimestamps
	},
	(t) => [
		uniqueIndex('drug_interaction_source_external_uidx').on(
			t.source,
			t.externalId
		),
		index('drug_interaction_rxcui_a_idx').on(t.rxcuiA),
		index('drug_interaction_rxcui_b_idx').on(t.rxcuiB),
		index('drug_interaction_ing_a_idx').on(t.ingredientRxcuiA),
		index('drug_interaction_ing_b_idx').on(t.ingredientRxcuiB)
	]
);

export const allergyRxnormMapTable = pgTable(
	'allergy_rxnorm_map',
	{
		id: serial('id').primaryKey(),
		allergyId: integer('allergy_id').notNull(),
		ingredientRxcui: varchar('ingredient_rxcui', { length: 16 }).notNull(),
		...rxTimestamps
	},
	(t) => [
		uniqueIndex('allergy_rxnorm_map_allergy_uidx').on(t.allergyId)
	]
);

export const ddinterRxnormMapTable = pgTable(
	'ddinter_rxnorm_map',
	{
		id: serial('id').primaryKey(),
		ddinterDrugKey: varchar('ddinter_drug_key', { length: 512 }).notNull(),
		rxcui: varchar('rxcui', { length: 16 }).notNull(),
		...rxTimestamps
	},
	(t) => [
		uniqueIndex('ddinter_rxnorm_map_key_uidx').on(t.ddinterDrugKey)
	]
);

// Merged from diagnostics-table.ts
const diagnosticsTimestamps = {
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
};

export const hospitalLabSettingTable = pgTable(
	'hospital_lab_setting',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		accessionPrefix: varchar('accession_prefix', { length: 32 })
			.notNull()
			.default('LAB'),
		criticalPolicy: varchar('critical_policy', { length: 64 })
			.notNull()
			.default('callback_after_release'),
		autoNursingCompleteOnRelease: boolean('auto_nursing_complete_on_release')
			.notNull()
			.default(false),
		enabledSectionsJson: jsonb('enabled_sections_json')
			.notNull()
			.default(['hematology', 'chemistry', 'microbiology']),
		labelFormatJson: jsonb('label_format_json').notNull().default({}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		uniqueIndex('hospital_lab_setting_hospital_uidx').on(t.hospitalId)
	]
);

export const labTestTable = pgTable(
	'lab_test',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id').references(() => hospitalTable.id, {
			onDelete: 'cascade'
		}),
		code: varchar('code', { length: 64 }).notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		loincCode: varchar('loinc_code', { length: 32 }),
		section: varchar('section', { length: 32 }).notNull(),
		dataType: varchar('data_type', { length: 16 }).notNull().default('numeric'),
		unit: varchar('unit', { length: 64 }),
		refRangeLow: decimal('ref_range_low', { precision: 14, scale: 4 }),
		refRangeHigh: decimal('ref_range_high', { precision: 14, scale: 4 }),
		refRangeText: varchar('ref_range_text', { length: 256 }),
		criticalLow: decimal('critical_low', { precision: 14, scale: 4 }),
		criticalHigh: decimal('critical_high', { precision: 14, scale: 4 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		index('lab_test_hospital_idx').on(t.hospitalId),
		index('lab_test_section_idx').on(t.section)
	]
);

export const labPanelTable = pgTable(
	'lab_panel',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id').references(() => hospitalTable.id, {
			onDelete: 'cascade'
		}),
		code: varchar('code', { length: 64 }).notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		section: varchar('section', { length: 32 }).notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [index('lab_panel_hospital_idx').on(t.hospitalId)]
);

export const labPanelMemberTable = pgTable(
	'lab_panel_member',
	{
		id: serial('id').primaryKey(),
		panelId: integer('panel_id')
			.notNull()
			.references(() => labPanelTable.id, { onDelete: 'cascade' }),
		testId: integer('test_id')
			.notNull()
			.references(() => labTestTable.id, { onDelete: 'cascade' }),
		sortOrder: integer('sort_order').notNull().default(1),
		...diagnosticsTimestamps
	},
	(t) => [
		uniqueIndex('lab_panel_member_panel_test_uidx').on(t.panelId, t.testId)
	]
);

export const labServiceTestMapTable = pgTable(
	'lab_service_test_map',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		serviceItemId: integer('service_item_id')
			.notNull()
			.references(() => serviceItemTable.id, { onDelete: 'cascade' }),
		targetType: varchar('target_type', { length: 16 }).notNull(),
		targetId: integer('target_id').notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		uniqueIndex('lab_service_test_map_service_uidx').on(
			t.hospitalId,
			t.serviceItemId
		)
	]
);

export const labOrderTable = pgTable(
	'lab_order',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id, { onDelete: 'cascade' }),
		serviceOrderDetailId: integer('service_order_detail_id')
			.notNull()
			.references(() => serviceOrderDetailTable.id, { onDelete: 'cascade' }),
		priority: varchar('priority', { length: 16 }).notNull().default('routine'),
		clinicalNotes: text('clinical_notes'),
		orderStatus: varchar('order_status', { length: 32 })
			.notNull()
			.default('ordered'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		uniqueIndex('lab_order_service_order_detail_uidx').on(t.serviceOrderDetailId),
		index('lab_order_visit_idx').on(t.visitId),
		index('lab_order_hospital_idx').on(t.hospitalId)
	]
);

export const labAccessionTable = pgTable(
	'lab_accession',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		labOrderId: integer('lab_order_id')
			.notNull()
			.references(() => labOrderTable.id, { onDelete: 'cascade' }),
		accessionNo: varchar('accession_no', { length: 64 }).notNull(),
		barcodePayload: varchar('barcode_payload', { length: 256 }).notNull(),
		section: varchar('section', { length: 32 }).notNull(),
		accessionStatus: varchar('accession_status', { length: 32 })
			.notNull()
			.default('ordered'),
		requestedTestsJson: jsonb('requested_tests_json').notNull().default([]),
		collectionSite: varchar('collection_site', { length: 256 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		uniqueIndex('lab_accession_no_hospital_uidx').on(t.hospitalId, t.accessionNo),
		index('lab_accession_status_idx').on(t.hospitalId, t.section, t.accessionStatus)
	]
);

export const labSpecimenTable = pgTable(
	'lab_specimen',
	{
		id: serial('id').primaryKey(),
		accessionId: integer('accession_id')
			.notNull()
			.references(() => labAccessionTable.id, { onDelete: 'cascade' }),
		specimenType: varchar('specimen_type', { length: 32 }).notNull(),
		collectedAt: timestamp('collected_at', {
			withTimezone: true,
			mode: 'string'
		}),
		collectedBy: uuid('collected_by').references(() => staffTable.id),
		receivedAt: timestamp('received_at', {
			withTimezone: true,
			mode: 'string'
		}),
		receivedBy: uuid('received_by').references(() => staffTable.id),
		rejectReason: varchar('reject_reason', { length: 32 }),
		rejectNote: text('reject_note'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [index('lab_specimen_accession_idx').on(t.accessionId)]
);

export const labResultReportTable = pgTable(
	'lab_result_report',
	{
		id: serial('id').primaryKey(),
		accessionId: integer('accession_id')
			.notNull()
			.references(() => labAccessionTable.id, { onDelete: 'cascade' }),
		reportStatus: varchar('report_status', { length: 16 })
			.notNull()
			.default('preliminary'),
		releasedAt: timestamp('released_at', {
			withTimezone: true,
			mode: 'string'
		}),
		releasedBy: uuid('released_by').references(() => staffTable.id),
		verifiedAt: timestamp('verified_at', {
			withTimezone: true,
			mode: 'string'
		}),
		verifiedBy: uuid('verified_by').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [index('lab_result_report_accession_idx').on(t.accessionId)]
);

export const labResultObservationTable = pgTable(
	'lab_result_observation',
	{
		id: serial('id').primaryKey(),
		reportId: integer('report_id')
			.notNull()
			.references(() => labResultReportTable.id, { onDelete: 'cascade' }),
		testId: integer('test_id')
			.notNull()
			.references(() => labTestTable.id),
		valueNumeric: decimal('value_numeric', { precision: 14, scale: 4 }),
		valueText: text('value_text'),
		unit: varchar('unit', { length: 64 }),
		refRangeText: varchar('ref_range_text', { length: 256 }),
		abnormalFlag: varchar('abnormal_flag', { length: 8 }),
		isCritical: boolean('is_critical').notNull().default(false),
		observationStatus: varchar('observation_status', { length: 16 })
			.notNull()
			.default('draft'),
		source: varchar('source', { length: 16 }).notNull().default('manual'),
		enteredBy: uuid('entered_by').references(() => staffTable.id),
		verifiedBy: uuid('verified_by').references(() => staffTable.id),
		verifiedAt: timestamp('verified_at', {
			withTimezone: true,
			mode: 'string'
		}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		index('lab_result_observation_report_idx').on(t.reportId),
		index('lab_result_observation_critical_idx').on(t.isCritical)
	]
);

export const labCriticalCallbackTable = pgTable(
	'lab_critical_callback',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		observationId: integer('observation_id')
			.notNull()
			.references(() => labResultObservationTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		callbackStatus: varchar('callback_status', { length: 32 })
			.notNull()
			.default('open'),
		calledParty: varchar('called_party', { length: 256 }),
		readBackText: text('read_back_text'),
		calledAt: timestamp('called_at', { withTimezone: true, mode: 'string' }),
		completedAt: timestamp('completed_at', {
			withTimezone: true,
			mode: 'string'
		}),
		completedBy: uuid('completed_by').references(() => staffTable.id),
		assignedStaffId: uuid('assigned_staff_id').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		index('lab_critical_callback_hospital_status_idx').on(
			t.hospitalId,
			t.callbackStatus
		)
	]
);

export const labAuditTable = pgTable(
	'lab_audit',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		entityType: varchar('entity_type', { length: 64 }).notNull(),
		entityId: integer('entity_id').notNull(),
		action: varchar('action', { length: 64 }).notNull(),
		staffId: uuid('staff_id').references(() => staffTable.id),
		detailJson: jsonb('detail_json'),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [
		index('lab_audit_entity_idx').on(t.entityType, t.entityId),
		index('lab_audit_hospital_idx').on(t.hospitalId)
	]
);

export const labIntegrationMessageTable = pgTable(
	'lab_integration_message',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		direction: varchar('direction', { length: 16 }).notNull(),
		protocol: varchar('protocol', { length: 32 }).notNull().default('hl7_v2'),
		rawPayload: text('raw_payload').notNull(),
		parseStatus: varchar('parse_status', { length: 16 })
			.notNull()
			.default('pending'),
		parseError: text('parse_error'),
		accessionNo: varchar('accession_no', { length: 64 }),
		processedAt: timestamp('processed_at', {
			withTimezone: true,
			mode: 'string'
		}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		index('lab_integration_message_hospital_status_idx').on(
			t.hospitalId,
			t.parseStatus
		)
	]
);

// Merged from medication-order-table.ts
const medOrderTimestamps = {
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

/** Medication order: dosage form (tablet, capsule, …). Global; hospital opt-out via `med_order_form_inactive`. */
export const medOrderFormTable = pgTable(
	'med_order_form',
	{
		id: serial('id').primaryKey(),
		isPreset: boolean('is_preset').notNull().default(false),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_form_name_idx').on(t.name),
		index('med_order_form_preset_idx')
			.on(t.isPreset)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);

export const medOrderFormInactiveTable = pgTable(
	'med_order_form_inactive',
	{
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		formId: integer('form_id')
			.notNull()
			.references(() => medOrderFormTable.id, {
				onDelete: 'cascade'
			}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		createdBy: text('created_by').references(
			(): AnyPgColumn => userTable.id,
			{
				onDelete: 'set null',
				onUpdate: 'cascade'
			}
		)
	},
	(t) => [
		uniqueIndex('med_order_form_inactive_hospital_form_uidx').on(
			t.hospitalId,
			t.formId
		),
		index('med_order_form_inactive_hospital_id_idx').on(t.hospitalId),
		index('med_order_form_inactive_form_id_idx').on(t.formId)
	]
);

export const medOrderRouteTable = pgTable(
	'med_order_route',
	{
		id: serial('id').primaryKey(),
		/** Seeded or user-created global rows. Hospital enable/disable is via `med_order_route_inactive`. */
		isPreset: boolean('is_preset').notNull().default(false),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_route_name_idx').on(t.name),
		index('med_order_route_preset_idx')
			.on(t.isPreset)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);

/**
 * Hospital-scoped inactive list: master route rows are global; hospitals only store disabled rows here.
 */
export const medOrderRouteInactiveTable = pgTable(
	'med_order_route_inactive',
	{
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		routeId: integer('route_id')
			.notNull()
			.references(() => medOrderRouteTable.id, {
				onDelete: 'cascade'
			}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		createdBy: text('created_by').references(
			(): AnyPgColumn => userTable.id,
			{
				onDelete: 'set null',
				onUpdate: 'cascade'
			}
		)
	},
	(t) => [
		uniqueIndex('med_order_route_inactive_hospital_route_uidx').on(
			t.hospitalId,
			t.routeId
		),
		index('med_order_route_inactive_hospital_id_idx').on(
			t.hospitalId
		),
		index('med_order_route_inactive_route_id_idx').on(t.routeId)
	]
);

export const medOrderOrderTypeTable = pgTable(
	'med_order_order_type',
	{
		id: serial('id').primaryKey(),
		isPreset: boolean('is_preset').notNull().default(false),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_order_type_name_idx').on(t.name),
		index('med_order_order_type_preset_idx')
			.on(t.isPreset)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);

export const medOrderOrderTypeInactiveTable = pgTable(
	'med_order_order_type_inactive',
	{
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		orderTypeId: integer('order_type_id')
			.notNull()
			.references(() => medOrderOrderTypeTable.id, {
				onDelete: 'cascade'
			}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		createdBy: text('created_by').references(
			(): AnyPgColumn => userTable.id,
			{
				onDelete: 'set null',
				onUpdate: 'cascade'
			}
		)
	},
	(t) => [
		uniqueIndex(
			'med_order_order_type_inactive_hospital_type_uidx'
		).on(t.hospitalId, t.orderTypeId),
		index('med_order_order_type_inactive_hospital_id_idx').on(
			t.hospitalId
		),
		index('med_order_order_type_inactive_order_type_id_idx').on(
			t.orderTypeId
		)
	]
);

export const medOrderDoseUnitTable = pgTable(
	'med_order_dose_unit',
	{
		id: serial('id').primaryKey(),
		isPreset: boolean('is_preset').notNull().default(false),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_dose_unit_name_idx').on(t.name),
		index('med_order_dose_unit_preset_idx')
			.on(t.isPreset)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);

export const medOrderDoseUnitInactiveTable = pgTable(
	'med_order_dose_unit_inactive',
	{
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		doseUnitId: integer('dose_unit_id')
			.notNull()
			.references(() => medOrderDoseUnitTable.id, {
				onDelete: 'cascade'
			}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		createdBy: text('created_by').references(
			(): AnyPgColumn => userTable.id,
			{
				onDelete: 'set null',
				onUpdate: 'cascade'
			}
		)
	},
	(t) => [
		uniqueIndex(
			'med_order_dose_unit_inactive_hospital_dose_unit_uidx'
		).on(t.hospitalId, t.doseUnitId),
		index('med_order_dose_unit_inactive_hospital_id_idx').on(
			t.hospitalId
		),
		index('med_order_dose_unit_inactive_dose_unit_id_idx').on(
			t.doseUnitId
		)
	]
);

export const medOrderFoodRelationTable = pgTable(
	'med_order_food_relation',
	{
		id: serial('id').primaryKey(),
		isPreset: boolean('is_preset').notNull().default(false),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_food_relation_name_idx').on(t.name),
		index('med_order_food_relation_preset_idx')
			.on(t.isPreset)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);

export const medOrderFoodRelationInactiveTable = pgTable(
	'med_order_food_relation_inactive',
	{
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		foodRelationId: integer('food_relation_id')
			.notNull()
			.references(() => medOrderFoodRelationTable.id, {
				onDelete: 'cascade'
			}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		createdBy: text('created_by').references(
			(): AnyPgColumn => userTable.id,
			{
				onDelete: 'set null',
				onUpdate: 'cascade'
			}
		)
	},
	(t) => [
		uniqueIndex(
			'med_order_food_relation_inactive_hospital_food_uidx'
		).on(t.hospitalId, t.foodRelationId),
		index('med_order_food_relation_inactive_hospital_id_idx').on(
			t.hospitalId
		),
		index('med_order_food_relation_inactive_food_relation_id_idx').on(
			t.foodRelationId
		)
	]
);

export const medOrderDurationUnitTable = pgTable(
	'med_order_duration_unit',
	{
		id: serial('id').primaryKey(),
		isPreset: boolean('is_preset').notNull().default(false),
		/** Short code: minute, hour, day, week, month */
		code: varchar('code', { length: 64 }).notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		sequenceNo: integer('sequence_no').notNull().default(0),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		uniqueIndex('med_order_duration_unit_global_code_uidx')
			.on(t.code)
			.where(sql`${t.deletedAt} IS NULL`),
		index('med_order_duration_unit_preset_idx')
			.on(t.isPreset)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);

export const medOrderDurationUnitInactiveTable = pgTable(
	'med_order_duration_unit_inactive',
	{
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		durationUnitId: integer('duration_unit_id')
			.notNull()
			.references(() => medOrderDurationUnitTable.id, {
				onDelete: 'cascade'
			}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		createdBy: text('created_by').references(
			(): AnyPgColumn => userTable.id,
			{
				onDelete: 'set null',
				onUpdate: 'cascade'
			}
		)
	},
	(t) => [
		uniqueIndex(
			'med_order_duration_unit_inactive_hospital_unit_uidx'
		).on(t.hospitalId, t.durationUnitId),
		index('med_order_duration_unit_inactive_hospital_id_idx').on(
			t.hospitalId
		),
		index('med_order_duration_unit_inactive_duration_unit_id_idx').on(
			t.durationUnitId
		)
	]
);

/**
 * Dosing frequency master.
 * `kind`: fixed_times | interval | prn | custom (extensible).
 */
export const medOrderFrequencyTable = pgTable(
	'med_order_frequency',
	{
		id: serial('id').primaryKey(),
		label: varchar('label', { length: 512 }).notNull(),
		/** Protected built-in rows; cannot be deleted and only allow active/inactive toggle. */
		isPreset: boolean('is_preset').notNull().default(false),
		description: text('description'),
		abbreviation: varchar('abbreviation', { length: 64 }),
		/** Occurrences per day (legacy-like). */
		frequencyPerDay: decimal('frequency_per_day', {
			precision: 18,
			scale: 6
		}),
		sequenceNo: integer('sequence_no').notNull().default(0),
		isCommonFrequency: boolean('is_common_frequency')
			.notNull()
			.default(false),
		isTimingRequired: boolean('is_timing_required')
			.notNull()
			.default(false),
		diffPlotOneHourlyValue: integer('diff_plot_one_hourly_value'),
		diffPlotTwoHourlyValue: integer('diff_plot_two_hourly_value'),
		diffPlotHalfHourlyValue: integer('diff_plot_half_hourly_value'),
		diffPlotFourHourlyValue: integer('diff_plot_four_hourly_value'),
		diffPlotSixHourlyValue: integer('diff_plot_six_hourly_value'),
		variableDose: boolean('variable_dose').notNull().default(false),
		pictorialDefinition: text('pictorial_definition'),
		isFrequencyInfusion: boolean('is_frequency_infusion')
			.notNull()
			.default(false),
		localLanguage: text('local_language'),
		kind: varchar('kind', { length: 64 }).notNull().default('custom'),
		summaryText: text('summary_text'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_frequency_label_idx').on(t.label),
		index('med_order_frequency_preset_idx')
			.on(t.isPreset)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);

/**
 * Hospital-scoped inactive list for frequencies.
 * Master frequency rows stay global; hospitals only store disabled rows here.
 */
export const medOrderFrequencyInactiveTable = pgTable(
	'med_order_frequency_inactive',
	{
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		frequencyId: integer('frequency_id')
			.notNull()
			.references(() => medOrderFrequencyTable.id, {
				onDelete: 'cascade'
			}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		createdBy: text('created_by').references(
			(): AnyPgColumn => userTable.id,
			{
				onDelete: 'set null',
				onUpdate: 'cascade'
			}
		)
	},
	(t) => [
		uniqueIndex(
			'med_order_frequency_inactive_hospital_frequency_uidx'
		).on(t.hospitalId, t.frequencyId),
		index('med_order_frequency_inactive_hospital_id_idx').on(
			t.hospitalId
		),
		index('med_order_frequency_inactive_frequency_id_idx').on(
			t.frequencyId
		)
	]
);

export const medicationOrderBatchTable = pgTable(
	'medication_order_batch',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id').references(
			() => patientVisitTable.id,
			{
				onDelete: 'restrict'
			}
		),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		/**
		 * External sales marker / display name (patient full name).
		 * Set for external-origin batches even when `visitId` is present (OP visit + OP bill).
		 * Internal sales keeps this null.
		 */
		extCustomerName: varchar('ext_customer_name', { length: 512 }),
		advisingDoctor: varchar('advising_doctor', { length: 512 }),
		orderingStaffId: uuid('ordering_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		consultantCosignedAt: timestamp('consultant_cosigned_at', {
			withTimezone: true
		}),
		consultantCosignedBy: uuid('consultant_cosigned_by').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		batchNo: varchar('batch_no', { length: 256 }).notNull(),
		batchRemarks: text('batch_remarks'),
		...medOrderTimestamps
	},
	(t) => [
		index('medication_order_batch_hospital_id_idx').on(t.hospitalId),
		index('medication_order_batch_visit_id_idx').on(t.visitId),
		uniqueIndex('medication_order_batch_hospital_batch_no_uidx')
			.on(t.hospitalId, t.batchNo)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);

export const medicationOrderLineTable = pgTable(
	'medication_order_line',
	{
		id: serial('id').primaryKey(),
		batchId: integer('batch_id')
			.notNull()
			.references(() => medicationOrderBatchTable.id, {
				onDelete: 'cascade'
			}),
		lineNo: integer('line_no').notNull().default(1),
		itemMasterId: integer('item_master_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
		dose: decimal('dose', { precision: 18, scale: 6 }).notNull(),
		doseUnitId: integer('dose_unit_id')
			.notNull()
			.references(() => medOrderDoseUnitTable.id, {
				onDelete: 'restrict'
			}),
		frequencyId: integer('frequency_id')
			.notNull()
			.references(() => medOrderFrequencyTable.id, {
				onDelete: 'restrict'
			}),
		durationValue: decimal('duration_value', {
			precision: 18,
			scale: 6
		}).notNull(),
		durationUnitId: integer('duration_unit_id')
			.notNull()
			.references(() => medOrderDurationUnitTable.id, {
				onDelete: 'restrict'
			}),
		formId: integer('form_id').references(
			() => medOrderFormTable.id,
			{
				onDelete: 'set null'
			}
		),
		routeId: integer('route_id').references(
			() => medOrderRouteTable.id,
			{
				onDelete: 'set null'
			}
		),
		orderTypeId: integer('order_type_id').references(
			() => medOrderOrderTypeTable.id,
			{ onDelete: 'set null' }
		),
		foodRelationId: integer('food_relation_id').references(
			() => medOrderFoodRelationTable.id,
			{ onDelete: 'set null' }
		),
		startAt: timestamp('start_at', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		testDose: text('test_dose'),
		substituteNotAllowed: boolean('substitute_not_allowed')
			.notNull()
			.default(false),
		itemUnitMasterId: integer('item_unit_master_id').references(
			() => itemUnitMasterTable.id,
			{ onDelete: 'restrict' }
		),
		/** Sale quantity in {@link outUnitId}. */
		qtyOut: decimal('qty_out', {
			precision: 18,
			scale: 6
		}),
		/** Unit for {@link qtyOut} and {@link unitSalePrice} (purchase or issue unit from IUM). */
		outUnitId: integer('out_unit_id').references(() => unitTable.id, {
			onDelete: 'restrict'
		}),
		unitSalePrice: decimal('unit_sale_price', {
			precision: 14,
			scale: 2
		}),
		/** Formula template revision used for {@link unitSalePrice} / {@link unitSalePriceIssue}. */
		pricingFormulaTemplateId: integer('pricing_formula_template_id').references(
			() => invPricingFormulaTemplateTable.id,
			{ onDelete: 'restrict' }
		),
		/** `IS` | `ES` | `DC` at charge time. */
		pricingModule: varchar('pricing_module', { length: 16 }),
		/** Primary stock batch used for COST slot at charge time. */
		pricingBatchId: integer('pricing_batch_id').references(
			() => itemBatchTable.id,
			{ onDelete: 'restrict' }
		),
		/** Patient charge per issue unit (formula anchor). */
		unitSalePriceIssue: decimal('unit_sale_price_issue', {
			precision: 14,
			scale: 2
		}),
		pricingInputsSnapshot: jsonb('pricing_inputs_snapshot'),
		pricingComputedAt: timestamp('pricing_computed_at', {
			withTimezone: true,
			mode: 'string'
		}),
		lineRemarks: text('line_remarks'),
		...medOrderTimestamps
	},
	(t) => [
		index('medication_order_line_batch_id_idx').on(t.batchId),
		index('medication_order_line_pricing_formula_template_id_idx').on(
			t.pricingFormulaTemplateId
		)
	]
);

export const medicationOrderLineAllocationTable = pgTable(
	'medication_order_line_allocation',
	{
		id: serial('id').primaryKey(),
		lineId: integer('line_id')
			.notNull()
			.references(() => medicationOrderLineTable.id, {
				onDelete: 'cascade'
			}),
		batchId: integer('batch_id')
			.notNull()
			.references(() => itemBatchTable.id, { onDelete: 'restrict' }),
		qtyPurchase: decimal('qty_purchase', {
			precision: 18,
			scale: 6
		}).notNull(),
		...medOrderTimestamps
	},
	(t) => [
		index('medication_order_line_allocation_line_id_idx').on(
			t.lineId
		),
		index('medication_order_line_allocation_batch_id_idx').on(
			t.batchId
		)
	]
);

export const medicationOrderBatchPaymentTable = pgTable(
	'medication_order_batch_payment',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		batchId: integer('batch_id')
			.notNull()
			.references(() => medicationOrderBatchTable.id, {
				onDelete: 'cascade'
			}),
		paymentMethod: varchar('payment_method', { length: 64 })
			.notNull()
			.default('cash'),
		amountDue: decimal('amount_due', {
			precision: 14,
			scale: 2
		}).notNull(),
		amountPaid: decimal('amount_paid', {
			precision: 14,
			scale: 2
		}).notNull(),
		paidAt: timestamp('paid_at', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		receiptNo: varchar('receipt_no', { length: 256 }).notNull(),
		...medOrderTimestamps
	},
	(t) => [
		uniqueIndex('medication_order_batch_payment_batch_id_uidx')
			.on(t.batchId)
			.where(sql`${t.deletedAt} IS NULL`),
		uniqueIndex(
			'medication_order_batch_payment_hospital_receipt_uidx'
		)
			.on(t.hospitalId, t.receiptNo)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);

// Merged from clinical-platform-table.ts
const clinicalTimestamps = {
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

/** Structured order set header (feature 63). */
export const clinicalOrderSetTable = pgTable(
	'clinical_order_set',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		specialtyTag: varchar('specialty_tag', { length: 128 }),
		version: integer('version').notNull().default(1),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [index('clinical_order_set_hospital_idx').on(t.hospitalId)]
);

export const clinicalOrderSetTriggerTable = pgTable(
	'clinical_order_set_trigger',
	{
		id: serial('id').primaryKey(),
		orderSetId: integer('order_set_id')
			.notNull()
			.references(() => clinicalOrderSetTable.id, {
				onDelete: 'cascade'
			}),
		triggerType: varchar('trigger_type', { length: 32 }).notNull(),
		triggerRefId: integer('trigger_ref_id'),
		triggerRefCode: varchar('trigger_ref_code', { length: 128 }),
		...clinicalTimestamps
	},
	(t) => [index('clinical_order_set_trigger_set_idx').on(t.orderSetId)]
);

export const clinicalOrderSetLineTable = pgTable(
	'clinical_order_set_line',
	{
		id: serial('id').primaryKey(),
		orderSetId: integer('order_set_id')
			.notNull()
			.references(() => clinicalOrderSetTable.id, {
				onDelete: 'cascade'
			}),
		lineNo: integer('line_no').notNull().default(1),
		lineType: varchar('line_type', { length: 32 }).notNull(),
		payloadJson: jsonb('payload_json').notNull().default({}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [index('clinical_order_set_line_set_idx').on(t.orderSetId)]
);

/** CDS prescribing alerts (feature 64). */
export const prescribingAlertTable = pgTable(
	'prescribing_alert',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id').references(() => patientVisitTable.id, {
			onDelete: 'set null'
		}),
		batchId: integer('batch_id').references(
			() => medicationOrderBatchTable.id,
			{ onDelete: 'set null' }
		),
		alertType: varchar('alert_type', { length: 64 }).notNull(),
		severity: varchar('severity', { length: 16 }).notNull(),
		message: text('message').notNull(),
		conceptRef: varchar('concept_ref', { length: 64 }),
		overridden: boolean('overridden').notNull().default(false),
		overrideReasonCode: varchar('override_reason_code', { length: 64 }),
		overrideRemark: text('override_remark'),
		overriddenBy: uuid('overridden_by').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		overriddenAt: timestamp('overridden_at', { withTimezone: true }),
		createdBy: uuid('created_by').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		...clinicalTimestamps
	},
	(t) => [
		index('prescribing_alert_hospital_idx').on(t.hospitalId),
		index('prescribing_alert_batch_idx').on(t.batchId)
	]
);

/** Hospital formulary tier (feature 65). */
export const hospitalFormularyItemTable = pgTable(
	'hospital_formulary_item',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		itemMasterId: integer('item_master_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'cascade' }),
		tier: varchar('tier', { length: 32 }).notNull(),
		effectiveFrom: date('effective_from'),
		effectiveTo: date('effective_to'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('hospital_formulary_item_hospital_item_uidx').on(
			t.hospitalId,
			t.itemMasterId
		)
	]
);

export const formularySubstitutionRuleTable = pgTable(
	'formulary_substitution_rule',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		restrictedItemMasterId: integer('restricted_item_master_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'cascade' }),
		preferredItemMasterId: integer('preferred_item_master_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'cascade' }),
		conditionsJson: jsonb('conditions_json').default({}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [index('formulary_sub_rule_hospital_idx').on(t.hospitalId)]
);

/** BCMA product barcode (feature 66). */
export const pharmacyProductIdentifierTable = pgTable(
	'pharmacy_product_identifier',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		itemMasterId: integer('item_master_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'cascade' }),
		barcodeValue: varchar('barcode_value', { length: 128 }).notNull(),
		identifierType: varchar('identifier_type', { length: 16 }).notNull(),
		isPrimary: boolean('is_primary').notNull().default(false),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('pharmacy_product_id_hospital_barcode_uidx').on(
			t.hospitalId,
			t.barcodeValue
		),
		index('pharmacy_product_id_item_idx').on(t.itemMasterId)
	]
);

/** Scheduled dose from active med order line (feature 66). */
export const medicationOrderScheduleTable = pgTable(
	'medication_order_schedule',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		lineId: integer('line_id')
			.notNull()
			.references(() => medicationOrderLineTable.id, {
				onDelete: 'cascade'
			}),
		scheduledAt: timestamp('scheduled_at', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		doseLabel: varchar('dose_label', { length: 256 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [
		index('med_order_schedule_visit_idx').on(t.visitId),
		index('med_order_schedule_due_idx').on(t.scheduledAt)
	]
);

export const medicationAdministrationTable = pgTable(
	'medication_administration',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		scheduleId: integer('schedule_id').references(
			() => medicationOrderScheduleTable.id,
			{ onDelete: 'set null' }
		),
		lineId: integer('line_id')
			.notNull()
			.references(() => medicationOrderLineTable.id, {
				onDelete: 'restrict'
			}),
		administrationStatus: varchar('administration_status', {
			length: 32
		}).notNull(),
		administeredAt: timestamp('administered_at', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		scannedPatientToken: varchar('scanned_patient_token', {
			length: 256
		}),
		scannedProductBarcode: varchar('scanned_product_barcode', {
			length: 128
		}),
		scannedNurseCode: varchar('scanned_nurse_code', { length: 128 }),
		nurseStaffId: uuid('nurse_staff_id').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		lateReason: text('late_reason'),
		remark: text('remark'),
		...clinicalTimestamps
	},
	(t) => [
		index('med_administration_visit_idx').on(t.visitId),
		index('med_administration_schedule_idx').on(t.scheduleId)
	]
);

/** IV infusion extension (feature 67). */
export const medicationOrderInfusionTable = pgTable(
	'medication_order_infusion',
	{
		id: serial('id').primaryKey(),
		lineId: integer('line_id')
			.notNull()
			.references(() => medicationOrderLineTable.id, {
				onDelete: 'cascade'
			}),
		infusionType: varchar('infusion_type', { length: 32 }).notNull(),
		totalVolumeMl: decimal('total_volume_ml', {
			precision: 18,
			scale: 6
		}),
		rateMlHr: decimal('rate_ml_hr', { precision: 18, scale: 6 }),
		rateWeightBasedJson: jsonb('rate_weight_based_json'),
		diluentItemMasterId: integer('diluent_item_master_id').references(
			() => itemMasterTable.id,
			{ onDelete: 'set null' }
		),
		concentration: varchar('concentration', { length: 128 }),
		pumpId: varchar('pump_id', { length: 128 }),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('med_order_infusion_line_uidx').on(t.lineId)
	]
);

/** Nursing care plan templates (feature 68). */
export const nursingCarePlanTemplateTable = pgTable(
	'nursing_care_plan_template',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 512 }).notNull(),
		nandaLabel: varchar('nanda_label', { length: 256 }),
		sectionsJson: jsonb('sections_json').notNull().default([]),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [index('nursing_care_plan_tpl_hospital_idx').on(t.hospitalId)]
);

export const nursingCarePlanInstanceTable = pgTable(
	'nursing_care_plan_instance',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		templateId: integer('template_id').references(
			() => nursingCarePlanTemplateTable.id,
			{ onDelete: 'set null' }
		),
		contentJson: jsonb('content_json').notNull().default({}),
		signedAt: timestamp('signed_at', { withTimezone: true }),
		signedBy: uuid('signed_by').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [index('nursing_care_plan_inst_visit_idx').on(t.visitId)]
);

/** Clinical alerts inbox (feature 69). */
export const clinicalAlertTable = pgTable(
	'clinical_alert',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: uuid('visit_id').references(() => patientVisitTable.id, {
			onDelete: 'set null'
		}),
		ruleCode: varchar('rule_code', { length: 64 }).notNull(),
		severity: varchar('severity', { length: 16 }).notNull(),
		title: varchar('title', { length: 512 }).notNull(),
		message: text('message').notNull(),
		payloadJson: jsonb('payload_json').default({}),
		alertStatus: varchar('alert_status', { length: 32 })
			.notNull()
			.default('open'),
		assignedStaffId: uuid('assigned_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
		acknowledgedBy: uuid('acknowledged_by').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
		...clinicalTimestamps
	},
	(t) => [
		index('clinical_alert_hospital_status_idx').on(
			t.hospitalId,
			t.alertStatus
		),
		index('clinical_alert_visit_idx').on(t.visitId)
	]
);

/** Progress note addendum (feature 71). */
export const progressNoteAddendumReasonTable = pgTable(
	'progress_note_addendum_reason',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 64 }).notNull(),
		label: varchar('label', { length: 256 }).notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('progress_note_addendum_reason_hospital_code_uidx').on(
			t.hospitalId,
			t.code
		)
	]
);

export const progressNoteAddendumTable = pgTable(
	'progress_note_addendum',
	{
		id: serial('id').primaryKey(),
		progressNoteId: integer('progress_note_id')
			.notNull()
			.references(() => progressNoteTable.id, { onDelete: 'cascade' }),
		reasonCode: varchar('reason_code', { length: 64 }).notNull(),
		body: text('body').notNull(),
		authorStaffId: uuid('author_staff_id').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [
		index('progress_note_addendum_note_idx').on(t.progressNoteId)
	]
);

/** ROI tracking (feature 72). */
export const roiRequestTable = pgTable(
	'roi_request',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		requesterName: varchar('requester_name', { length: 512 }).notNull(),
		requesterContact: varchar('requester_contact', { length: 256 }),
		scopeDescription: text('scope_description').notNull(),
		requestStatus: varchar('request_status', { length: 32 }).notNull(),
		dueDate: date('due_date'),
		assignedStaffId: uuid('assigned_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		...clinicalTimestamps
	},
	(t) => [index('roi_request_hospital_status_idx').on(t.hospitalId)]
);

export const roiRequestEventTable = pgTable(
	'roi_request_event',
	{
		id: serial('id').primaryKey(),
		roiRequestId: integer('roi_request_id')
			.notNull()
			.references(() => roiRequestTable.id, { onDelete: 'cascade' }),
		eventType: varchar('event_type', { length: 64 }).notNull(),
		remark: text('remark'),
		staffId: uuid('staff_id').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [index('roi_request_event_request_idx').on(t.roiRequestId)]
);

/** Immunization (feature 74). */
export const immunizationMasterTable = pgTable(
	'immunization_master',
	{
		id: serial('id').primaryKey(),
		cvxCode: varchar('cvx_code', { length: 16 }).notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		scheduleRulesJson: jsonb('schedule_rules_json').default([]),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [uniqueIndex('immunization_master_cvx_uidx').on(t.cvxCode)]
);

export const patientImmunizationTable = pgTable(
	'patient_immunization',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: uuid('visit_id').references(() => patientVisitTable.id, {
			onDelete: 'set null'
		}),
		immunizationMasterId: integer('immunization_master_id')
			.notNull()
			.references(() => immunizationMasterTable.id, {
				onDelete: 'restrict'
			}),
		administeredOn: date('administered_on').notNull(),
		doseSequence: integer('dose_sequence').notNull().default(1),
		lotNumber: varchar('lot_number', { length: 128 }),
		site: varchar('site', { length: 128 }),
		administratorStaffId: uuid('administrator_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		visGiven: boolean('vis_given').notNull().default(false),
		remark: text('remark'),
		...clinicalTimestamps
	},
	(t) => [index('patient_immunization_patient_idx').on(t.patientId)]
);

/** Chronic disease registry (feature 75). */
export const registryDefinitionTable = pgTable(
	'registry_definition',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 64 }).notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		inclusionRulesJson: jsonb('inclusion_rules_json').default({}),
		recallIntervalDays: integer('recall_interval_days').default(90),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('registry_definition_hospital_code_uidx').on(
			t.hospitalId,
			t.code
		)
	]
);

export const registryMemberTable = pgTable(
	'registry_member',
	{
		id: serial('id').primaryKey(),
		registryDefinitionId: integer('registry_definition_id')
			.notNull()
			.references(() => registryDefinitionTable.id, {
				onDelete: 'cascade'
			}),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		enrolledAt: timestamp('enrolled_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		lastReviewAt: timestamp('last_review_at', {
			withTimezone: true,
			mode: 'string'
		}),
		nextRecallDate: date('next_recall_date'),
		memberStatus: varchar('member_status', { length: 32 }).notNull(),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('registry_member_registry_patient_uidx').on(
			t.registryDefinitionId,
			t.patientId
		),
		index('registry_member_recall_idx').on(t.nextRecallDate)
	]
);

// Merged from perioperative-table.ts
const perioperativeTimestamps = {
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
};

export const clinicalFormTemplateTable = pgTable(
	'clinical_form_template',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id').references(() => hospitalTable.id, {
			onDelete: 'cascade'
		}),
		code: varchar('code', { length: 128 }).notNull(),
		version: integer('version').notNull().default(1),
		title: varchar('title', { length: 512 }).notNull(),
		schemaJson: jsonb('schema_json').notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [
		uniqueIndex('clinical_form_template_code_hospital_uidx').on(
			t.code,
			sql`COALESCE(${t.hospitalId}, '00000000-0000-0000-0000-000000000000'::uuid)`
		)
	]
);

export const clinicalFormInstanceTable = pgTable(
	'clinical_form_instance',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		surgicalCaseId: integer('surgical_case_id'),
		templateId: integer('template_id')
			.notNull()
			.references(() => clinicalFormTemplateTable.id),
		contextType: varchar('context_type', { length: 64 }).notNull(),
		valuesJson: jsonb('values_json').notNull().default({}),
		statusTaggingId: integer('status_tagging_id').references(
			() => statusTaggingTable.id
		),
		signedAt: timestamp('signed_at', {
			withTimezone: true,
			mode: 'string'
		}),
		signedBy: uuid('signed_by').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [
		index('clinical_form_instance_visit_idx').on(t.visitId),
		index('clinical_form_instance_case_idx').on(t.surgicalCaseId)
	]
);

export const otRoomTable = pgTable(
	'ot_room',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		name: varchar('name', { length: 256 }).notNull(),
		sequenceNo: integer('sequence_no').notNull().default(0),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [index('ot_room_hospital_branch_idx').on(t.hospitalId, t.branchId)]
);

export const surgicalCaseTable = pgTable(
	'surgical_case',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		admissionId: integer('admission_id').references(
			() => ipdAdmissionTable.id,
			{ onDelete: 'set null' }
		),
		serviceOrderDetailId: integer('service_order_detail_id').references(
			() => serviceOrderDetailTable.id,
			{ onDelete: 'set null' }
		),
		otRoomId: integer('ot_room_id').references(() => otRoomTable.id, {
			onDelete: 'set null'
		}),
		procedureName: varchar('procedure_name', { length: 512 })
			.notNull()
			.default(''),
		caseType: varchar('case_type', { length: 32 })
			.notNull()
			.default('general'),
		priority: varchar('priority', { length: 32 })
			.notNull()
			.default('elective'),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id),
		scheduledStart: timestamp('scheduled_start', {
			withTimezone: true,
			mode: 'string'
		}),
		scheduledEnd: timestamp('scheduled_end', {
			withTimezone: true,
			mode: 'string'
		}),
		actualStart: timestamp('actual_start', {
			withTimezone: true,
			mode: 'string'
		}),
		actualEnd: timestamp('actual_end', {
			withTimezone: true,
			mode: 'string'
		}),
		preOpCompleteAt: timestamp('pre_op_complete_at', {
			withTimezone: true,
			mode: 'string'
		}),
		displacedByCaseId: integer('displaced_by_case_id'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [
		index('surgical_case_hospital_idx').on(t.hospitalId),
		index('surgical_case_visit_idx').on(t.visitId),
		index('surgical_case_room_schedule_idx').on(
			t.otRoomId,
			t.scheduledStart
		)
	]
);

export const surgicalCaseStaffTable = pgTable(
	'surgical_case_staff',
	{
		surgicalCaseId: integer('surgical_case_id')
			.notNull()
			.references(() => surgicalCaseTable.id, { onDelete: 'cascade' }),
		staffId: uuid('staff_id')
			.notNull()
			.references(() => staffTable.id),
		roleCode: varchar('role_code', { length: 32 }).notNull()
	},
	(t) => [
		primaryKey({
			columns: [t.surgicalCaseId, t.staffId, t.roleCode]
		})
	]
);

export const surgicalCaseAuditTable = pgTable(
	'surgical_case_audit',
	{
		id: serial('id').primaryKey(),
		surgicalCaseId: integer('surgical_case_id')
			.notNull()
			.references(() => surgicalCaseTable.id, { onDelete: 'cascade' }),
		action: varchar('action', { length: 64 }).notNull(),
		detailJson: jsonb('detail_json'),
		staffId: uuid('staff_id').references(() => staffTable.id),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [index('surgical_case_audit_case_idx').on(t.surgicalCaseId)]
);

export const edEncounterTable = pgTable(
	'ed_encounter',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		boardColumn: varchar('board_column', { length: 64 })
			.notNull()
			.default('waiting_triage'),
		fastTrack: boolean('fast_track').notNull().default(false),
		triageSystem: varchar('triage_system', { length: 16 }),
		triageFormInstanceId: integer('triage_form_instance_id'),
		acuityLevel: varchar('acuity_level', { length: 32 }),
		edTriageLevelId: integer('ed_triage_level_id').references(
			() => edTriageLevelTable.id,
			{ onDelete: 'set null' }
		),
		isMlc: boolean('is_mlc').notNull().default(false),
		registrationRemarks: text('registration_remarks'),
		assignedDoctorId: uuid('assigned_doctor_id').references(
			() => staffTable.id
		),
		erWardId: integer('er_ward_id').references(() => wardTable.id, {
			onDelete: 'set null'
		}),
		erRoomId: integer('er_room_id').references(() => roomTable.id, {
			onDelete: 'set null'
		}),
		erBedId: integer('er_bed_id').references(() => bedTable.id, {
			onDelete: 'set null'
		}),
		erBedAssignedAt: timestamp('er_bed_assigned_at', {
			withTimezone: true,
			mode: 'string'
		}),
		arrivedAt: timestamp('arrived_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		dischargedAt: timestamp('discharged_at', {
			withTimezone: true,
			mode: 'string'
		}),
		retainErBedAfterDischarge: boolean('retain_er_bed_after_discharge')
			.notNull()
			.default(false),
		dischargeRemarks: text('discharge_remarks'),
		erBedChargeServiceOrderDetailId: integer(
			'er_bed_charge_service_order_detail_id'
		),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [uniqueIndex('ed_encounter_visit_uidx').on(t.visitId)]
);

export const traumaActivationTable = pgTable(
	'trauma_activation',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		levelCode: varchar('level_code', { length: 16 }).notNull(),
		activationLevelId: integer('activation_level_id').references(
			() => hospitalTraumaActivationLevelTable.id,
			{ onDelete: 'set null' }
		),
		activatedAt: timestamp('activated_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		deactivatedAt: timestamp('deactivated_at', {
			withTimezone: true,
			mode: 'string'
		}),
		deactivateReason: text('deactivate_reason'),
		formInstanceId: integer('form_instance_id'),
		activatedBy: uuid('activated_by').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [index('trauma_activation_hospital_idx').on(t.hospitalId)]
);

export const traumaActivationMilestoneTable = pgTable(
	'trauma_activation_milestone',
	{
		id: serial('id').primaryKey(),
		traumaActivationId: integer('trauma_activation_id')
			.notNull()
			.references(() => traumaActivationTable.id, { onDelete: 'cascade' }),
		milestoneTemplateId: integer('milestone_template_id')
			.notNull()
			.references(() => hospitalTraumaMilestoneTemplateTable.id, {
				onDelete: 'cascade'
			}),
		completedAt: timestamp('completed_at', {
			withTimezone: true,
			mode: 'string'
		}),
		completedBy: uuid('completed_by').references(() => staffTable.id)
	},
	(t) => [
		uniqueIndex('trauma_activation_milestone_uidx').on(
			t.traumaActivationId,
			t.milestoneTemplateId
		)
	]
);

export const traumaActivationTeamAckTable = pgTable(
	'trauma_activation_team_ack',
	{
		id: serial('id').primaryKey(),
		traumaActivationId: integer('trauma_activation_id')
			.notNull()
			.references(() => traumaActivationTable.id, { onDelete: 'cascade' }),
		teamRoleId: integer('team_role_id')
			.notNull()
			.references(() => hospitalTraumaTeamRoleTable.id, {
				onDelete: 'cascade'
			}),
		notified: boolean('notified').notNull().default(false),
		acknowledgedAt: timestamp('acknowledged_at', {
			withTimezone: true,
			mode: 'string'
		}),
		staffId: uuid('staff_id').references(() => staffTable.id)
	},
	(t) => [
		uniqueIndex('trauma_activation_team_ack_uidx').on(
			t.traumaActivationId,
			t.teamRoleId
		)
	]
);

export const surgicalCaseImplantTable = pgTable(
	'surgical_case_implant',
	{
		id: serial('id').primaryKey(),
		surgicalCaseId: integer('surgical_case_id')
			.notNull()
			.references(() => surgicalCaseTable.id, { onDelete: 'cascade' }),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		itemBatchId: integer('item_batch_id').references(
			() => itemBatchTable.id,
			{ onDelete: 'set null' }
		),
		udiRaw: varchar('udi_raw', { length: 512 }),
		quantity: decimal('quantity', { precision: 14, scale: 4 })
			.notNull()
			.default('1'),
		departmentConsumptionId: uuid('department_consumption_id'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [index('surgical_case_implant_case_idx').on(t.surgicalCaseId)]
);

export const hospitalPerioperativeSettingTable = pgTable(
	'hospital_perioperative_setting',
	{
		hospitalId: uuid('hospital_id')
			.primaryKey()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		defaultEdTriageSystem: varchar('default_ed_triage_system', {
			length: 16
		})
			.notNull()
			.default('esi'),
		preOpMandatory: boolean('pre_op_mandatory').notNull().default(true),
		whoBlockWithoutTimeout: boolean('who_block_without_timeout')
			.notNull()
			.default(false),
		updatedAt: timestamp('updated_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	}
);

export const ldEncounterTable = pgTable(
	'ld_encounter',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		boardColumn: varchar('board_column', { length: 64 })
			.notNull()
			.default('active_labor'),
		partogramFormInstanceId: integer('partogram_form_instance_id'),
		deliveryFormInstanceId: integer('delivery_form_instance_id'),
		surgicalCaseId: integer('surgical_case_id').references(
			() => surgicalCaseTable.id,
			{ onDelete: 'set null' }
		),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [uniqueIndex('ld_encounter_visit_uidx').on(t.visitId)]
);

// Merged from hospital-document-table.ts
const docLinkTimestamps = {
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
};

/** Hospital ↔ global document (type + layout are per hospital). */
export const hospitalDocumentTable = pgTable(
	'hospital_document',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		documentId: integer('document_id')
			.notNull()
			.references(() => documentTable.id, { onDelete: 'cascade' }),
		documentTypeId: integer('document_type_id')
			.notNull()
			.references(() => documentTypeTable.id),
		locale: varchar('locale', { length: 16 }).notNull().default('en'),
		documentSettingId: integer('document_setting_id').references(
			() => hospitalDocumentSettingsTable.id
		),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...docLinkTimestamps
	},
	(t) => [
		uniqueIndex('hospital_document_hospital_document_uidx').on(
			t.hospitalId,
			t.documentId
		),
		index('hospital_document_hospital_idx').on(t.hospitalId),
		index('hospital_document_document_type_id_idx').on(t.documentTypeId)
	]
);

export const hospitalDocumentTextPlaceholderTable = pgTable(
	'hospital_document_text_placeholder',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 64 }).notNull(),
		text: text('text').notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...docLinkTimestamps
	},
	(t) => [
		uniqueIndex('hospital_doc_text_ph_hospital_code_uidx').on(
			t.hospitalId,
			t.code
		),
		index('hospital_doc_text_ph_hospital_idx').on(t.hospitalId)
	]
);

export { documentTable, documentTypeTable } from '../master-table/master-table';
