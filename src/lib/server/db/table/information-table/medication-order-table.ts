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
	itemUnitMasterTable,
	patientVisitTable,
	storeTable
} from './information-table';
import { itemBatchTable } from './inventory-transaction-table';

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
		visitId: integer('visit_id').references(
			() => patientVisitTable.id,
			{
				onDelete: 'restrict'
			}
		),
		storeId: integer('store_id')
			.notNull()
			.references(() => storeTable.id, { onDelete: 'restrict' }),
		/** Walk-in / external sales: set when `visitId` is null (internal uses visit + nulls here) */
		extCustomerName: varchar('ext_customer_name', { length: 512 }),
		advisingDoctor: varchar('advising_doctor', { length: 512 }),
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
		issueQtyPurchase: decimal('issue_qty_purchase', {
			precision: 18,
			scale: 6
		}),
		unitSalePrice: decimal('unit_sale_price', {
			precision: 14,
			scale: 2
		}),
		lineRemarks: text('line_remarks'),
		...medOrderTimestamps
	},
	(t) => [index('medication_order_line_batch_id_idx').on(t.batchId)]
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
		index('medication_order_line_allocation_line_id_idx').on(t.lineId),
		index('medication_order_line_allocation_batch_id_idx').on(t.batchId)
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
		uniqueIndex('medication_order_batch_payment_hospital_receipt_uidx')
			.on(t.hospitalId, t.receiptNo)
			.where(sql`${t.deletedAt} IS NULL`)
	]
);
