import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { StatusEnum } from '../../../../model/enum/db-link';
import { statusTable } from '../master-table/master-table';
import { hospitalTable, serviceItemTable } from './information-table';

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
};

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
		...timestamps
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
		...timestamps
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
		...timestamps
	},
	(t) => [
		uniqueIndex('hospital_trauma_activation_level_hospital_code_uidx').on(
			t.hospitalId,
			t.code
		),
		index('hospital_trauma_activation_level_hospital_id_idx').on(
			t.hospitalId
		)
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
		...timestamps
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
		...timestamps
	},
	(t) => [
		uniqueIndex('hospital_trauma_team_role_hospital_code_uidx').on(
			t.hospitalId,
			t.code
		),
		index('hospital_trauma_team_role_hospital_id_idx').on(t.hospitalId)
	]
);
