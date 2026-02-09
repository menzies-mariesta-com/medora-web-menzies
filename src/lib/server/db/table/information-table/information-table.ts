import { sql } from 'drizzle-orm';
import {
	date,
	foreignKey,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { StatusEnum } from '../../../../model/enum/db-link';
import { userTable } from '../auth-table/auth-table';
import { bloodTypeTable, cityTable, countryTable, departmentTable, genderTable, identityTypeTable, maritalStatusTable, nationalityTable, postalCodeTable, positionTable, specializationTable, staffEmploymentTypeTable, staffTypeTable, stateTable, statusTable, titleTable } from '../master-table/master-table';
import { m } from '$lib/paraglide/messages';

const timestamps = {
	createdAt: timestamp('created_at', {
		withTimezone: true,
		mode: 'string',
	})
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', {
		withTimezone: true,
		mode: 'string',
	})
		.notNull()
		.defaultNow()
		.$onUpdate(() => sql`now()`),
} as const;

// Information Tables (alphabetical) - business/transactional data
export const hospitalTable = pgTable('hospital', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	cityId: integer('city_id').references(() => cityTable.id),
	stateId: integer('state_id').references(() => stateTable.id),
	countryId: integer('country_id').references(() => countryTable.id),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const hospitalDepartmentTable = pgTable('hospital_department', {
	id: serial('id').primaryKey(),
	hospitalId: integer('hospital_id').references(() => hospitalTable.id).notNull(),
	departmentId: integer('department_id').references(() => departmentTable.id).notNull(),
	...timestamps,
});

export const moduleTable = pgTable('module', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	imageUrl: text('image_url'),
	moduleUrl: text('module_url'),
	sequenceNo: integer('sequence_no'),
	statusId: integer('status_id')
		.notNull()
		.references(() => statusTable.id),
	...timestamps,
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
		statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
		...timestamps,
	},
	(self) => [
		foreignKey({
			columns: [self.parentId],
			foreignColumns: [self.id],
		}),
	],
);

export const staffDetailTable = pgTable('staff_detail', {
	id: serial('id').primaryKey(),
	licenseNo: varchar('license_no', { length: 512 }),
	licenseExpiryDate: date('license_expiry_date'),
	signatureImageUrl: text('signature_image_url'),
	signatureText: text('signature_text'),
	designation: varchar('designation', { length: 512 }),
	education: varchar('education', { length: 512 }),
	bloodTypeId: integer('blood_type_id').references(() => bloodTypeTable.id),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const staffDepartmentTable = pgTable('staff_department', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	departmentId: integer('department_id')
		.notNull()
		.references(() => departmentTable.id),
	...timestamps,
});

export const staffHospitalTable = pgTable('staff_hospital', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	hospitalId: integer('hospital_id')
		.notNull()
		.references(() => hospitalTable.id),
	...timestamps,
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
	dateOfBirth: date('date_of_birth'),
	photoUrl: text('photo_url'),
	address: text('address'),
	remark: text('remark'),
	identityNo: varchar('identity_no', { length: 128 }),
	identityTypeId: integer('identity_type_id').references(() => identityTypeTable.id),
	titleId: integer('title_id').references(() => titleTable.id),
	staffEmploymentTypeId: integer('staff_employment_type_id').references(() => staffEmploymentTypeTable.id),
	staffTypeId: integer('staff_type_id').references(() => staffTypeTable.id),
	staffDetailId: integer('staff_detail_id').references(() => staffDetailTable.id),
	cityId: integer('city_id').references(() => cityTable.id),
	stateId: integer('state_id').references(() => stateTable.id),
	countryId: integer('country_id').references(() => countryTable.id),
	maritalStatusId: integer('marital_status_id').references(() => maritalStatusTable.id),
	nationalityId: integer('nationality_id').references(() => nationalityTable.id),
	positionId: integer('position_id').references(() => positionTable.id),
	postalCodeId: integer('postal_code_id').references(() => postalCodeTable.id),
	specializationId: integer('specialization_id').references(() => specializationTable.id),
	genderId: integer('gender_id').references(() => genderTable.id),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	//staffHospitalTable
	//staffDepartmentTable
	//staffUserGroupTable
	...timestamps,
});

export const staffUserGroupTable = pgTable('staff_user_group', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	userGroupId: integer('user_group_id')
		.notNull()
		.references(() => userGroupTable.id),
	...timestamps,
});

export const statusTaggingTable = pgTable('status_tagging', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	sequenceNo: integer('sequence_no'),
	statusTaggingTypeId: integer('status_tagging_type_id').references(() => statusTaggingTypeTable.id),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const statusTaggingTypeTable = pgTable('status_tagging_type', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const userGroupPageTable = pgTable('user_group_page', {
	id: serial('id').primaryKey(),
	userGroupId: integer('user_group_id').references(() => userGroupTable.id),
	pageId: integer('page_id').references(() => pageTable.id),
	...timestamps,
});

export const userGroupTable = pgTable('user_group', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	hospitalId: integer('hospital_id').references(() => hospitalTable.id),
	//userGroupPageTable
	...timestamps,
});

export const patientTable = pgTable('patient', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	code: varchar('code', { length: 512 }),
	registrationNo: varchar('registration_no', { length: 512 }),
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
	guardian_name: varchar('guardian_name', { length: 512 }),
	guardian_phone: varchar('guardian_phone', { length: 128 }),
	photo_path: text('photo_path'),
	address: text('address'),
	remarks: text('remarks'),
	maritalStatusId: integer('marital_status_id').references(() => maritalStatusTable.id),
	genderId: integer('gender_id').references(() => genderTable.id),
	identityTypeId: integer('identity_type_id').references(() => identityTypeTable.id),
	bloodTypeId: integer('blood_type_id').references(() => bloodTypeTable.id),
	cityId: integer('city_id').references(() => cityTable.id),
	stateId: integer('state_id').references(() => stateTable.id),
	countryId: integer('country_id').references(() => countryTable.id),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamp,
})

export const patientAttachmentTable = pgTable('patient_attachment', {
	id: serial('id').primaryKey(),
	patientId: uuid('patient_id')
		.notNull()
		.references(() => patientTable.id),
	filePath: text('file_path'),
	description: text('description'),
	...timestamp,
})

export const insuranceTable = pgTable('insurance_table', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text('name'),
	...timestamp,

})

export const patientInsurance = pgTable('patient_insurance', {
	id: serial('id').primaryKey(),
	patientId: uuid('patient_id')
		.notNull()
		.references(() => patientTable.id),
	insuranceId: uuid('insurance_id')
		.notNull()
		.references(() => insuranceTable.id),
	...timestamp,
})

export const patientAllergies = pgTable('patient_allergies', {
	id: serial('id').primaryKey(),
	patientId: uuid('patient_id')
		.notNull()
		.references(() => patientTable.id),
	description: text('description'),
	...timestamp,
})