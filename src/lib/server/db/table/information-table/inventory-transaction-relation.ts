import { relations } from 'drizzle-orm';
import {
	itemMasterTable,
	itemUnitMasterTable,
	hospitalTable,
	staffTable,
	storeTable,
	supplierTable
} from './information-table';
import { unitTable } from '../master-table/master-table';
import {
	goodsReceiptLineTable,
	goodsReceiptNoteTable,
	invApprovalAssigneeTable,
	invApprovalLevelTable,
	invItemReorderLevelTable,
	invStockAlertEmailSentTable,
	invStockAlertRecipientTable,
	invStockAlertSettingTable,
	invDepartmentConsumptionLineTable,
	invDepartmentConsumptionTable,
	invStockIssueLineTable,
	invStockIssueTable,
	invStockTable,
	itemBatchTable,
	invStoreTransferLineTable,
	invStoreTransferTable,
	purchaseOrderLineTable,
	purchaseOrderTable,
	purchaseRequisitionLineTable,
	purchaseRequisitionTable
} from './inventory-transaction-table';

export const invApprovalLevelTableRelations = relations(
	invApprovalLevelTable,
	({ one, many }) => ({
		hospital: one(hospitalTable, {
			fields: [invApprovalLevelTable.hospitalId],
			references: [hospitalTable.id]
		}),
		store: one(storeTable, {
			fields: [invApprovalLevelTable.storeId],
			references: [storeTable.id]
		}),
		assignees: many(invApprovalAssigneeTable)
	})
);

export const invApprovalAssigneeTableRelations = relations(
	invApprovalAssigneeTable,
	({ one }) => ({
		level: one(invApprovalLevelTable, {
			fields: [invApprovalAssigneeTable.levelId],
			references: [invApprovalLevelTable.id]
		}),
		staff: one(staffTable, {
			fields: [invApprovalAssigneeTable.staffId],
			references: [staffTable.id]
		})
	})
);

export const invItemReorderLevelTableRelations = relations(
	invItemReorderLevelTable,
	({ one }) => ({
		hospital: one(hospitalTable, {
			fields: [invItemReorderLevelTable.hospitalId],
			references: [hospitalTable.id]
		}),
		store: one(storeTable, {
			fields: [invItemReorderLevelTable.storeId],
			references: [storeTable.id]
		}),
		item: one(itemMasterTable, {
			fields: [invItemReorderLevelTable.itemId],
			references: [itemMasterTable.id]
		}),
		itemUnitMaster: one(itemUnitMasterTable, {
			fields: [invItemReorderLevelTable.itemUnitMasterId],
			references: [itemUnitMasterTable.id]
		})
	})
);

export const invStockAlertSettingTableRelations = relations(
	invStockAlertSettingTable,
	({ one }) => ({
		hospital: one(hospitalTable, {
			fields: [invStockAlertSettingTable.hospitalId],
			references: [hospitalTable.id]
		})
	})
);

export const invStockAlertRecipientTableRelations = relations(
	invStockAlertRecipientTable,
	({ one }) => ({
		hospital: one(hospitalTable, {
			fields: [invStockAlertRecipientTable.hospitalId],
			references: [hospitalTable.id]
		}),
		store: one(storeTable, {
			fields: [invStockAlertRecipientTable.storeId],
			references: [storeTable.id]
		}),
		staff: one(staffTable, {
			fields: [invStockAlertRecipientTable.staffId],
			references: [staffTable.id]
		})
	})
);

export const invStockAlertEmailSentTableRelations = relations(
	invStockAlertEmailSentTable,
	({ one }) => ({
		hospital: one(hospitalTable, {
			fields: [invStockAlertEmailSentTable.hospitalId],
			references: [hospitalTable.id]
		}),
		store: one(storeTable, {
			fields: [invStockAlertEmailSentTable.storeId],
			references: [storeTable.id]
		}),
		staff: one(staffTable, {
			fields: [invStockAlertEmailSentTable.recipientStaffId],
			references: [staffTable.id]
		})
	})
);

export const purchaseRequisitionTableRelations = relations(
	purchaseRequisitionTable,
	({ one, many }) => ({
		hospital: one(hospitalTable, {
			fields: [purchaseRequisitionTable.hospitalId],
			references: [hospitalTable.id]
		}),
		fromStore: one(storeTable, {
			fields: [purchaseRequisitionTable.fromStoreId],
			references: [storeTable.id]
		}),
		toStore: one(storeTable, {
			fields: [purchaseRequisitionTable.toStoreId],
			references: [storeTable.id]
		}),
		lines: many(purchaseRequisitionLineTable),
		purchaseOrders: many(purchaseOrderTable)
	})
);

export const purchaseRequisitionLineTableRelations = relations(
	purchaseRequisitionLineTable,
	({ one, many }) => ({
		pr: one(purchaseRequisitionTable, {
			fields: [purchaseRequisitionLineTable.prId],
			references: [purchaseRequisitionTable.id]
		}),
		poLines: many(purchaseOrderLineTable)
	})
);

export const purchaseOrderTableRelations = relations(
	purchaseOrderTable,
	({ one, many }) => ({
		pr: one(purchaseRequisitionTable, {
			fields: [purchaseOrderTable.prId],
			references: [purchaseRequisitionTable.id]
		}),
		store: one(storeTable, {
			fields: [purchaseOrderTable.storeId],
			references: [storeTable.id]
		}),
		lines: many(purchaseOrderLineTable),
		grns: many(goodsReceiptNoteTable)
	})
);

export const purchaseOrderLineTableRelations = relations(
	purchaseOrderLineTable,
	({ one, many }) => ({
		po: one(purchaseOrderTable, {
			fields: [purchaseOrderLineTable.poId],
			references: [purchaseOrderTable.id]
		}),
		prLine: one(purchaseRequisitionLineTable, {
			fields: [purchaseOrderLineTable.prLineId],
			references: [purchaseRequisitionLineTable.id]
		}),
		grnLines: many(goodsReceiptLineTable)
	})
);

export const itemBatchTableRelations = relations(
	itemBatchTable,
	({ one, many }) => ({
		hospital: one(hospitalTable, {
			fields: [itemBatchTable.hospitalId],
			references: [hospitalTable.id]
		}),
		item: one(itemMasterTable, {
			fields: [itemBatchTable.itemId],
			references: [itemMasterTable.id]
		}),
		stocks: many(invStockTable)
	})
);

export const invStockTableRelations = relations(
	invStockTable,
	({ one }) => ({
		hospital: one(hospitalTable, {
			fields: [invStockTable.hospitalId],
			references: [hospitalTable.id]
		}),
		store: one(storeTable, {
			fields: [invStockTable.storeId],
			references: [storeTable.id]
		}),
		item: one(itemMasterTable, {
			fields: [invStockTable.itemId],
			references: [itemMasterTable.id]
		}),
		batch: one(itemBatchTable, {
			fields: [invStockTable.batchId],
			references: [itemBatchTable.id]
		})
	})
);

export const goodsReceiptNoteTableRelations = relations(
	goodsReceiptNoteTable,
	({ one, many }) => ({
		po: one(purchaseOrderTable, {
			fields: [goodsReceiptNoteTable.poId],
			references: [purchaseOrderTable.id]
		}),
		supplier: one(supplierTable, {
			fields: [goodsReceiptNoteTable.supplierId],
			references: [supplierTable.id]
		}),
		store: one(storeTable, {
			fields: [goodsReceiptNoteTable.storeId],
			references: [storeTable.id]
		}),
		lines: many(goodsReceiptLineTable)
	})
);

export const goodsReceiptLineTableRelations = relations(
	goodsReceiptLineTable,
	({ one }) => ({
		grn: one(goodsReceiptNoteTable, {
			fields: [goodsReceiptLineTable.grnId],
			references: [goodsReceiptNoteTable.id]
		}),
		poLine: one(purchaseOrderLineTable, {
			fields: [goodsReceiptLineTable.poLineId],
			references: [purchaseOrderLineTable.id]
		}),
		batch: one(itemBatchTable, {
			fields: [goodsReceiptLineTable.batchId],
			references: [itemBatchTable.id]
		})
	})
);

export const invStoreTransferTableRelations = relations(
	invStoreTransferTable,
	({ many }) => ({
		lines: many(invStoreTransferLineTable)
	})
);

export const invStoreTransferLineTableRelations = relations(
	invStoreTransferLineTable,
	({ one }) => ({
		transfer: one(invStoreTransferTable, {
			fields: [invStoreTransferLineTable.transferId],
			references: [invStoreTransferTable.id]
		}),
		batch: one(itemBatchTable, {
			fields: [invStoreTransferLineTable.batchId],
			references: [itemBatchTable.id]
		})
	})
);

export const invStockIssueTableRelations = relations(
	invStockIssueTable,
	({ many }) => ({
		lines: many(invStockIssueLineTable)
	})
);

export const invStockIssueLineTableRelations = relations(
	invStockIssueLineTable,
	({ one }) => ({
		issue: one(invStockIssueTable, {
			fields: [invStockIssueLineTable.issueId],
			references: [invStockIssueTable.id]
		}),
		batch: one(itemBatchTable, {
			fields: [invStockIssueLineTable.batchId],
			references: [itemBatchTable.id]
		})
	})
);

export const invDepartmentConsumptionTableRelations = relations(
	invDepartmentConsumptionTable,
	({ one, many }) => ({
		hospital: one(hospitalTable, {
			fields: [invDepartmentConsumptionTable.hospitalId],
			references: [hospitalTable.id]
		}),
		store: one(storeTable, {
			fields: [invDepartmentConsumptionTable.storeId],
			references: [storeTable.id]
		}),
		lines: many(invDepartmentConsumptionLineTable)
	})
);

export const invDepartmentConsumptionLineTableRelations = relations(
	invDepartmentConsumptionLineTable,
	({ one }) => ({
		consumption: one(invDepartmentConsumptionTable, {
			fields: [invDepartmentConsumptionLineTable.consumptionId],
			references: [invDepartmentConsumptionTable.id]
		}),
		item: one(itemMasterTable, {
			fields: [invDepartmentConsumptionLineTable.itemId],
			references: [itemMasterTable.id]
		}),
		unit: one(unitTable, {
			fields: [invDepartmentConsumptionLineTable.unitId],
			references: [unitTable.id]
		}),
		batch: one(itemBatchTable, {
			fields: [invDepartmentConsumptionLineTable.batchId],
			references: [itemBatchTable.id]
		})
	})
);
