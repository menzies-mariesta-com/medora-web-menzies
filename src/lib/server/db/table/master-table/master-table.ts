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
	statusId: integer('status_id').references(() => statusTable.id),
	...timestamps,
});

export const cityTable = pgTable('city', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	statusId: integer('status_id').references(() => statusTable.id),
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
	statusId: integer('status_id').references(() => statusTable.id),
	...timestamps,
});

export const genderTable = pgTable('gender', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id),
	...timestamps,
});

export const identityTypeTable = pgTable('identity_type', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	...timestamps,
});

export const marialStatusTable = pgTable('marial_status', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	...timestamps,
});

export const specializationTable = pgTable('specialization', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
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
	statusId: integer('status_id').references(() => statusTable.id),
	...timestamps,
});

export const titleTable = pgTable('title', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id').references(() => statusTable.id),
	...timestamps,
});

export const staffTypeTable = pgTable('staff_type', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	code: varchar('code', { length: 128 }),
	statusId: integer('status_id').references(() => statusTable.id),
	...timestamps,
});
