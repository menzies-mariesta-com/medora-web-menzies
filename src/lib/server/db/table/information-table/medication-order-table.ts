import { sql } from 'drizzle-orm';
import {
	boolean,
	decimal,
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { StatusEnum } from '../../../../model/enum/db-link';
import { userTable } from '../auth-table/auth-table';
import { statusTable } from '../master-table/master-table';
import {
	hospitalTable,
	itemMasterTable,
	patientVisitTable,
	storeTable
} from './information-table';

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
	createdBy: text('created_by').references((): AnyPgColumn => userTable.id, {
		onDelete: 'set null',
		onUpdate: 'cascade'
	}),
	updatedBy: text('updated_by').references((): AnyPgColumn => userTable.id, {
		onDelete: 'set null',
		onUpdate: 'cascade'
	}),
	deletedBy: text('deleted_by').references((): AnyPgColumn => userTable.id, {
		onDelete: 'set null',
		onUpdate: 'cascade'
	})
} as const;

/** Medication order: dosage form (tablet, capsule, …). */
export const medOrderFormTable = pgTable(
	'med_order_form',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_form_hospital_id_idx').on(t.hospitalId),
		index('med_order_form_name_idx').on(t.name)
	]
);

export const medOrderRouteTable = pgTable(
	'med_order_route',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_route_hospital_id_idx').on(t.hospitalId),
		index('med_order_route_name_idx').on(t.name)
	]
);

export const medOrderOrderTypeTable = pgTable(
	'med_order_order_type',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_order_type_hospital_id_idx').on(t.hospitalId),
		index('med_order_order_type_name_idx').on(t.name)
	]
);

export const medOrderDoseUnitTable = pgTable(
	'med_order_dose_unit',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_dose_unit_hospital_id_idx').on(t.hospitalId),
		index('med_order_dose_unit_name_idx').on(t.name)
	]
);

export const medOrderFoodRelationTable = pgTable(
	'med_order_food_relation',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		description: text('description'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_food_relation_hospital_id_idx').on(t.hospitalId),
		index('med_order_food_relation_name_idx').on(t.name)
	]
);

export const medOrderDurationUnitTable = pgTable(
	'med_order_duration_unit',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
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
		index('med_order_duration_unit_hospital_id_idx').on(t.hospitalId),
		uniqueIndex('med_order_duration_unit_hospital_code_uidx')
			.on(t.hospitalId, t.code)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);

/**
 * Dosing frequency master; `config` holds structured UI state (JSON).
 * `kind`: fixed_times | interval | prn | custom (extensible).
 */
export const medOrderFrequencyTable = pgTable(
	'med_order_frequency',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		label: varchar('label', { length: 512 }).notNull(),
		kind: varchar('kind', { length: 64 }).notNull().default('custom'),
		config: jsonb('config')
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		summaryText: text('summary_text'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...medOrderTimestamps
	},
	(t) => [
		index('med_order_frequency_hospital_id_idx').on(t.hospitalId),
		index('med_order_frequency_label_idx').on(t.label)
	]
);

export const medicationOrderBatchTable = pgTable(
	'medication_order_batch',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: integer('visit_id').references(() => patientVisitTable.id, {
			onDelete: 'restrict'
		}),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		/** Walk-in / external sales: set when `visitId` is null (internal uses visit + nulls here) */
		extCustomerName: varchar('ext_customer_name', { length: 512 }),
		advisingDoctor: varchar('advising_doctor', { length: 512 }),
		batchNo: varchar('batch_no', { length: 256 }).notNull(),
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

export const medicationOrderLineTable = pgTable('medication_order_line', {
	id: serial('id').primaryKey(),
	batchId: integer('batch_id')
		.notNull()
		.references(() => medicationOrderBatchTable.id, { onDelete: 'cascade' }),
	lineNo: integer('line_no').notNull().default(1),
	itemMasterId: integer('item_master_id')
		.notNull()
		.references(() => itemMasterTable.id, { onDelete: 'restrict' }),
	dose: decimal('dose', { precision: 18, scale: 6 }).notNull(),
	doseUnitId: integer('dose_unit_id')
		.notNull()
		.references(() => medOrderDoseUnitTable.id, { onDelete: 'restrict' }),
	frequencyId: integer('frequency_id')
		.notNull()
		.references(() => medOrderFrequencyTable.id, { onDelete: 'restrict' }),
	durationValue: decimal('duration_value', {
		precision: 18,
		scale: 6
	}).notNull(),
	durationUnitId: integer('duration_unit_id')
		.notNull()
		.references(() => medOrderDurationUnitTable.id, { onDelete: 'restrict' }),
	formId: integer('form_id').references(() => medOrderFormTable.id, {
		onDelete: 'set null'
	}),
	routeId: integer('route_id').references(() => medOrderRouteTable.id, {
		onDelete: 'set null'
	}),
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
	...medOrderTimestamps
},
	(t) => [index('medication_order_line_batch_id_idx').on(t.batchId)]
);
