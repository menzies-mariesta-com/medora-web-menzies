/** HTTP JSON shape for GET `/inventory/department-indent?id=` (department indent detail). */
export type DepartmentIndentDetailLine = {
	id: number;
	indentId: string;
	itemId: number;
	quantity: string;
	unitId: number;
	qtyIssued: string;
	batchId: number | null;
	itemName?: string | null;
	unitName?: string | null;
	/** Resolved from item + purchase `unitId` for issue-equivalent display. */
	itemUnitMasterId?: number | null;
	itemUnitMasterConversion?: string | null;
	purchaseConversionFactor?: string | null;
	issueConversionFactor?: string | null;
	issueUnitName?: string | null;
};

export type DepartmentIndentAllocationRow = {
	lineId: number;
	itemId: number;
	itemName: string | null;
	batchId: number;
	batchNo: string | null;
	expiryDate: string | null;
	quantity: string;
	itemUnitMasterId?: number | null;
	purchaseConversionFactor?: string | null;
	issueConversionFactor?: string | null;
	issueUnitName?: string | null;
};

export type DepartmentIndentDetail = {
	id: string;
	hospitalId: string;
	indentNo: string | null;
	fromStoreId: number;
	toStoreId: number;
	requestedBy: string;
	statusTaggingId: number;
	currentLevel: number;
	remarks: string | null;
	fromApprovedBy: string | null;
	fromApprovedAt: string | null;
	issuedBy: string | null;
	issuedAt: string | null;
	receivedBy: string | null;
	receivedAt: string | null;
	cancelledBy: string | null;
	cancelledAt: string | null;
	cancelReason: string | null;
	createdAt: string;
	updatedAt: string;
	statusName?: string | null;
	statusCode?: string | null;
	fromStoreName?: string | null;
	toStoreName?: string | null;
	requestedByName?: string | null;
	/** Resolved display name; coalesced from `created_by` → requester when legacy/null. */
	createdByName?: string | null;
	updatedByName?: string | null;
	fromApprovedByName?: string | null;
	issuedByName?: string | null;
	receivedByName?: string | null;
	cancelledByName?: string | null;
	canApprove?: boolean;
	canCancel?: boolean;
	canIssue?: boolean;
	canReceive?: boolean;
	lines: DepartmentIndentDetailLine[];
	allocations: DepartmentIndentAllocationRow[];
};
