import { sql } from 'drizzle-orm';
import {
	date,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { userTable } from '../auth-table/auth-table';
import { bloodTypeTable, cityTable, countryTable, genderTable, identityTypeTable, marialStatusTable, specializationTable, stateTable, statusTable } from '../master-table/master-table';

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
export const departmentTable = pgTable('department', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	hospitalId: integer('hospital_id').references(() => hospitalTable.id),
	statusId: integer('status_id').references(() => statusTable.id),
	...timestamps,
});

export const hospitalTable = pgTable('hospital', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	cityId: integer('city_id').references(() => cityTable.id),
	stateId: integer('state_id').references(() => stateTable.id),
	countryId: integer('country_id').references(() => countryTable.id),
	statusId: integer('status_id').references(() => statusTable.id),
	...timestamps,
});

export const moduleTable = pgTable('module', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	icon: text('icon'),
	statusId: integer('status_id')
		.notNull()
		.references(() => statusTable.id),
	...timestamps,
});

export const pageTable = pgTable('page', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	icon: text('icon'),
	moduleId: integer('module_id').references(() => moduleTable.id),
	statusId: integer('status_id').references(() => statusTable.id),
	...timestamps,
});

export const roleTable = pgTable('role', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id),
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

export const staffRoleTable = pgTable('staff_role', {
	id: serial('id').primaryKey(),
	staffId: uuid('staff_id')
		.notNull()
		.references(() => staffTable.id),
	roleId: integer('role_id')
		.notNull()
		.references(() => roleTable.id),
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
	phonePrimary: varchar('phone_primary', { length: 128 }),
	phoneSecondary: varchar('phone_secondary', { length: 128 }),
	dateOfBirth: date('date_of_birth'),
	photoPath: text('photo_path'),
	address: text('address'),
	remark: text('remark'),
	identityNo: varchar('identity_no', { length: 128 }),
	identityTypeId: integer('identity_type_id').references(() => identityTypeTable.id),
	cityId: integer('city_id').references(() => cityTable.id),
	stateId: integer('state_id').references(() => stateTable.id),
	countryId: integer('country_id').references(() => countryTable.id),
	maritalStatusId: integer('marital_status_id').references(() => marialStatusTable.id),
	specializationId: integer('specialization_id').references(() => specializationTable.id),
	genderId: integer('gender_id').references(() => genderTable.id),
	bloodTypeId: integer('blood_type_id').references(() => bloodTypeTable.id),
	statusId: integer('status_id').references(() => statusTable.id),
	//staffHospitalTable
	//staffDepartmentTable
	//staffUserGroupTable
	//staffRoleTable
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

export const userGroupModuleTable = pgTable('user_group_module', {
	id: serial('id').primaryKey(),
	userGroupId: integer('user_group_id').references(() => userGroupTable.id),
	moduleId: integer('module_id').references(() => moduleTable.id),
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
	statusId: integer('status_id').references(() => statusTable.id),
	//userGroupModuleTable
	//userGroupPageTable
	...timestamps,
});
