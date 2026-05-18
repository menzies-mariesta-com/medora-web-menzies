import { sql } from 'drizzle-orm';
import {
	type AnyPgColumn,
	boolean,
	check,
	date,
	decimal,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
	uniqueIndex,
	index,
	varchar
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { userTable } from '../auth-table/auth-table';
import { unitTable } from '../master-table/master-table';
import {
	hospitalBranchTable,
	hospitalTable,
	itemMasterTable,
	itemUnitMasterTable,
	staffTable,
	statusTaggingTable,
	storeTable,
	supplierTable
} from './information-table';

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

/** Per-branch GRN sale / employee sale price calculation rules. */
export const invBranchPricingConfigTable = pgTable(
	'inv_branch_pricing_config',
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
		saleManualOnGrnLine: boolean('sale_manual_on_grn_line')
			.notNull()
			.default(false),
		saleIncludeDiscount: boolean('sale_include_discount')
			.notNull()
			.default(true),
		saleIncludeTax: boolean('sale_include_tax').notNull().default(true),
		saleIncludeFreeQty: boolean('sale_include_free_qty')
			.notNull()
			.default(false),
		saleMarkupPercent: decimal('sale_markup_percent', {
			precision: 8,
			scale: 2
		})
			.notNull()
			.default('0'),
		empManualOnGrnLine: boolean('emp_manual_on_grn_line')
			.notNull()
			.default(false),
		empIncludeDiscount: boolean('emp_include_discount')
			.notNull()
			.default(true),
		empIncludeTax: boolean('emp_include_tax').notNull().default(true),
		empIncludeFreeQty: boolean('emp_include_free_qty')
			.notNull()
			.default(true),
		empMarkupPercent: decimal('emp_markup_percent', {
			precision: 8,
			scale: 2
		})
			.notNull()
			.default('0'),
		empUsePercentOfSale: boolean('emp_use_percent_of_sale')
			.notNull()
			.default(false),
		empPercentOfSale: decimal('emp_percent_of_sale', {
			precision: 8,
			scale: 2
		})
			.notNull()
			.default('100'),
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
		uniqueIndex('inv_branch_pricing_config_hospital_branch_uidx').on(
			t.hospitalId,
			t.branchId
		),
		index('inv_branch_pricing_config_hospital_idx').on(t.hospitalId)
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
			.$defaultFn(() => uuidv7()),
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
			.$defaultFn(() => uuidv7()),
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
 * Normalized batch master (identity includes supplier + purchase price per migration SQL index).
 * Unique index `item_batch_identity_uidx` (NULLS NOT DISTINCT) is created in SQL migration.
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
		purchasePrice: decimal('purchase_price', {
			precision: 14,
			scale: 2
		})
			.notNull()
			.default('0'),
		/** Per issue unit; includes tax; excludes free qty + discount. */
		salePrice: decimal('sale_price', { precision: 14, scale: 2 }),
		/** Per issue unit; all-in (tax + discount + free benefits). */
		empSalePrice: decimal('emp_sale_price', {
			precision: 14,
			scale: 2
		}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [
		index('item_batch_hospital_item_idx').on(t.hospitalId, t.itemId),
		index('item_batch_expiry_idx').on(t.expiryDate)
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
			.$defaultFn(() => uuidv7()),
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
		receivedQty: decimal('received_qty', {
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
		salePrice: decimal('sale_price', { precision: 14, scale: 2 }),
		empSalePrice: decimal('emp_sale_price', {
			precision: 14,
			scale: 2
		}),
		...invTimestamps
	},
	(t) => [index('goods_receipt_line_grn_id_idx').on(t.grnId)]
);

export const invStoreTransferTable = pgTable(
	'inv_store_transfer',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidv7()),
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
			.$defaultFn(() => uuidv7()),
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
			.$defaultFn(() => uuidv7()),
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
			.$defaultFn(() => uuidv7()),
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
			.$defaultFn(() => uuidv7()),
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
		remarks: text('remarks'),
		...invTimestamps
	},
	(t) => [
		index('inv_department_consumption_line_consumption_id_idx').on(
			t.consumptionId
		)
	]
);
