import { StatusEnum } from '../../../../model/enum/db-link';
import { sql } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

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

// Master Tables (alphabetical) - lookup/reference data
export const bloodTypeTable = pgTable('blood_type', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const cityTable = pgTable('city', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	stateId: integer('state_id').references(() => stateTable.id),
	...timestamps,
});

export const countryTable = pgTable('country', {
	id: serial('id').primaryKey().notNull(),
	name: varchar('name', { length: 512 }).notNull(),
	code: varchar('code', { length: 128 }).notNull(),
	imageUrl: text('image_url').notNull(),
	language: varchar('language', { length: 128 }).notNull(),
	countryCallingCode: varchar('country_calling_code', { length: 128 }).notNull(),
	statusId: integer('status_id').references(() => statusTable.id).notNull(),
	...timestamps,
});

export const craftGroupTable = pgTable('craft_group', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }).notNull(),
	statusId: integer('status_id').references(() => statusTable.id).notNull(),
	...timestamps,
});

export const departmentTable = pgTable('department', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const genderTable = pgTable('gender', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const identityTypeTable = pgTable('identity_type', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const maritalStatusTable = pgTable('marital_status', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const nationalityTable = pgTable('nationality', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const positionTable = pgTable('position', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const postalCodeTable = pgTable('postal_code', {
	id: serial('id').primaryKey(),
	value: integer('value').notNull(),
	cityId: integer('city_id').references(() => cityTable.id).notNull(),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const religionTable = pgTable('religion', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
})

export const specializationTable = pgTable('specialization', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	craftGroupId: integer('craft_group_id').references(() => craftGroupTable.id),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const statusTable = pgTable('status', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	...timestamps,
});

export const stateTable = pgTable('state', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	countryId: integer('country_id').references(() => countryTable.id),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const staffEmploymentTypeTable = pgTable('staff_employment_type', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const staffShiftTypeTable = pgTable('staff_shift_type', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const staffTypeTable = pgTable('staff_type', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});

export const titleTable = pgTable('title', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps,
});


export const weekdayTable = pgTable('weekday', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id).notNull().default(StatusEnum.ACTIVE),
	...timestamps
})