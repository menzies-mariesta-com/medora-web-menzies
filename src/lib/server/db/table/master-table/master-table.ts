import { StatusEnum } from '../../../../model/enum/db-link';
import { sql } from 'drizzle-orm';
import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	varchar
} from 'drizzle-orm/pg-core';

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

// Master Tables (alphabetical) - lookup/reference data
export const bloodTypeTable = pgTable(
	'blood_type',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('blood_type_name_idx').on(table.name),
		index('blood_type_status_id_idx').on(table.statusId)
	]
);

export const categoryTable = pgTable(
	'category',
	{
		id: serial('id').primaryKey(),
		categoryName: varchar('category_name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		updatedBy: text('updated_by'),
		...timestamps
	},
	(table) => [
		index('category_name_idx').on(table.categoryName),
		index('category_status_id_idx').on(table.statusId)
	]
);

export const cityTable = pgTable(
	'city',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		code: varchar('code', { length: 128 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		stateId: integer('state_id').references(() => stateTable.id),
		...timestamps
	},
	(table) => [
		index('city_name_idx').on(table.name),
		index('city_code_idx').on(table.code),
		index('city_state_id_idx').on(table.stateId),
		index('city_status_id_idx').on(table.statusId)
	]
);

export const countryTable = pgTable(
	'country',
	{
		id: serial('id').primaryKey().notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 128 }).notNull(),
		imageUrl: text('image_url').notNull(),
		language: varchar('language', { length: 128 }).notNull(),
		countryCallingCode: varchar('country_calling_code', {
			length: 128
		}).notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull(),
		...timestamps
	},
	(table) => [
		index('country_name_idx').on(table.name),
		index('country_code_idx').on(table.code),
		index('country_calling_code_idx').on(table.countryCallingCode),
		index('country_status_id_idx').on(table.statusId)
	]
);

export const craftGroupTable = pgTable(
	'craft_group',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }).notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull(),
		...timestamps
	},
	(table) => [
		index('craft_group_name_idx').on(table.name),
		index('craft_group_status_id_idx').on(table.statusId)
	]
);

export const departmentTable = pgTable(
	'department',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		code: varchar('code', { length: 128 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('department_name_idx').on(table.name),
		index('department_code_idx').on(table.code),
		index('department_status_id_idx').on(table.statusId)
	]
);

export const genderTable = pgTable(
	'gender',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('gender_name_idx').on(table.name),
		index('gender_status_id_idx').on(table.statusId)
	]
);

export const identityTypeTable = pgTable(
	'identity_type',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('identity_type_name_idx').on(table.name),
		index('identity_type_status_id_idx').on(table.statusId)
	]
);

export const maritalStatusTable = pgTable(
	'marital_status',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('marital_status_name_idx').on(table.name),
		index('marital_status_status_id_idx').on(table.statusId)
	]
);

export const nationalityTable = pgTable(
	'nationality',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('nationality_name_idx').on(table.name),
		index('nationality_status_id_idx').on(table.statusId)
	]
);

export const positionTable = pgTable(
	'position',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('position_name_idx').on(table.name),
		index('position_status_id_idx').on(table.statusId)
	]
);

export const postalCodeTable = pgTable(
	'postal_code',
	{
		id: serial('id').primaryKey(),
		value: integer('value').notNull(),
		cityId: integer('city_id')
			.references(() => cityTable.id)
			.notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('postal_code_value_idx').on(table.value),
		index('postal_code_city_id_idx').on(table.cityId),
		index('postal_code_status_id_idx').on(table.statusId)
	]
);

export const referTypeTable = pgTable(
	'refer_type',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('refer_type_name_idx').on(table.name),
		index('refer_type_status_id_idx').on(table.statusId)
	]
);

export const religionTable = pgTable(
	'religion',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('religion_name_idx').on(table.name),
		index('religion_status_id_idx').on(table.statusId)
	]
);

export const severityTable = pgTable(
	'severity',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('severity_name_idx').on(table.name),
		index('severity_status_id_idx').on(table.statusId)
	]
);

export const specializationTable = pgTable(
	'specialization',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		craftGroupId: integer('craft_group_id').references(
			() => craftGroupTable.id
		),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('specialization_name_idx').on(table.name),
		index('specialization_craft_group_id_idx').on(table.craftGroupId),
		index('specialization_status_id_idx').on(table.statusId)
	]
);

export const statusTable = pgTable(
	'status',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		...timestamps
	},
	(table) => [index('status_name_idx').on(table.name)]
);

export const stateTable = pgTable(
	'state',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		code: varchar('code', { length: 128 }),
		countryId: integer('country_id').references(
			() => countryTable.id
		),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('state_name_idx').on(table.name),
		index('state_code_idx').on(table.code),
		index('state_country_id_idx').on(table.countryId),
		index('state_status_id_idx').on(table.statusId)
	]
);

export const staffEmploymentTypeTable = pgTable(
	'staff_employment_type',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		code: varchar('code', { length: 128 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('staff_employment_type_name_idx').on(table.name),
		index('staff_employment_type_code_idx').on(table.code),
		index('staff_employment_type_status_id_idx').on(table.statusId)
	]
);

export const staffShiftTypeTable = pgTable(
	'staff_shift_type',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		code: varchar('code', { length: 128 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('staff_shift_type_name_idx').on(table.name),
		index('staff_shift_type_code_idx').on(table.code),
		index('staff_shift_type_status_id_idx').on(table.statusId)
	]
);

export const staffTypeTable = pgTable(
	'staff_type',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		code: varchar('code', { length: 128 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('staff_type_name_idx').on(table.name),
		index('staff_type_code_idx').on(table.code),
		index('staff_type_status_id_idx').on(table.statusId)
	]
);

export const titleTable = pgTable(
	'title',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('title_name_idx').on(table.name),
		index('title_status_id_idx').on(table.statusId)
	]
);

export const weekdayTable = pgTable(
	'weekday',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('weekday_name_idx').on(table.name),
		index('weekday_status_id_idx').on(table.statusId)
	]
);

/** Unit type (e.g. length, weight) for categorising units. */
export const unitTypeTable = pgTable(
	'unit_type',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('unit_type_name_idx').on(table.name),
		index('unit_type_status_id_idx').on(table.statusId)
	]
);

/** Unit (e.g. cm, in, kg, lbs) for vitals and measurements. */
export const unitTable = pgTable(
	'unit',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		unitTypeId: integer('unit_type_id').references(
			() => unitTypeTable.id
		),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('unit_name_idx').on(table.name),
		index('unit_unit_type_id_idx').on(table.unitTypeId),
		index('unit_status_id_idx').on(table.statusId)
	]
);

/** Visit type (e.g. OPD, follow-up) for patient visits. */
export const visitTypeTable = pgTable(
	'visit_type',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }),
		code: varchar('code', { length: 128 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('visit_type_name_idx').on(table.name),
		index('visit_type_code_idx').on(table.code),
		index('visit_type_status_id_idx').on(table.statusId)
	]
);
