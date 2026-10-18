import {
	boolean,
	decimal,
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
import { IpdBedStatusEnum, StatusEnum } from '../../../../model/enum/db-link';
import { statusTable } from '../master-table/master-table';
import {
	hospitalBranchTable,
	hospitalTable,
	serviceItemTable
} from './information-table';

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

/** ER ward care tier (parallel to IPD ward_category). */
export const erWardCategoryTable = pgTable(
	'er_ward_category',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 64 }),
		wardMarkup: decimal('ward_markup', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('er_ward_category_hospital_id_idx').on(t.hospitalId),
		index('er_ward_category_status_id_idx').on(t.statusId)
	]
);

export const erRoomCategoryTable = pgTable(
	'er_room_category',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 64 }),
		roomMarkup: decimal('room_markup', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('er_room_category_hospital_id_idx').on(t.hospitalId),
		index('er_room_category_status_id_idx').on(t.statusId)
	]
);

/** ER ward master (Hospital → Branch → ER Ward → ER Room → ER Bed). */
export const erWardTable = pgTable(
	'er_ward',
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
		erWardCategoryId: integer('er_ward_category_id')
			.notNull()
			.references(() => erWardCategoryTable.id, {
				onDelete: 'restrict'
			}),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 64 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('er_ward_hospital_id_idx').on(t.hospitalId),
		index('er_ward_branch_id_idx').on(t.branchId),
		index('er_ward_category_id_idx').on(t.erWardCategoryId),
		index('er_ward_status_id_idx').on(t.statusId)
	]
);

export const erRoomTable = pgTable(
	'er_room',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		erWardId: integer('er_ward_id')
			.notNull()
			.references(() => erWardTable.id, { onDelete: 'cascade' }),
		erRoomCategoryId: integer('er_room_category_id')
			.notNull()
			.references(() => erRoomCategoryTable.id, {
				onDelete: 'restrict'
			}),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 64 }),
		capacity: integer('capacity').notNull().default(0),
		amenities: text('amenities'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('er_room_hospital_id_idx').on(t.hospitalId),
		index('er_room_ward_id_idx').on(t.erWardId),
		index('er_room_category_id_idx').on(t.erRoomCategoryId),
		index('er_room_status_id_idx').on(t.statusId)
	]
);

export const erBedTable = pgTable(
	'er_bed',
	{
		id: serial('id').primaryKey(),
		erRoomId: integer('er_room_id')
			.notNull()
			.references(() => erRoomTable.id, { onDelete: 'cascade' }),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 64 }),
		basePrice: decimal('base_price', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		bedStatus: integer('bed_status')
			.notNull()
			.default(IpdBedStatusEnum.FREE),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(t) => [
		index('er_bed_room_id_idx').on(t.erRoomId),
		index('er_bed_hospital_id_idx').on(t.hospitalId),
		index('er_bed_bed_status_idx').on(t.bedStatus),
		index('er_bed_status_id_idx').on(t.statusId)
	]
);

/** Per-hospital ER billing defaults (bed charge service, consumable bill service). */
export const hospitalEdBillingConfigTable = pgTable('hospital_ed_billing_config', {
	hospitalId: uuid('hospital_id')
		.primaryKey()
		.references(() => hospitalTable.id, { onDelete: 'cascade' }),
	erBedServiceItemId: integer('er_bed_service_item_id').references(
		() => serviceItemTable.id,
		{ onDelete: 'set null' }
	),
	erConsumableServiceItemId: integer(
		'er_consumable_service_item_id'
	).references(() => serviceItemTable.id, { onDelete: 'set null' }),
	...timestamps
});
