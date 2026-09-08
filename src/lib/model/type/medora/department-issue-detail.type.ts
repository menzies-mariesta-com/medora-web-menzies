/** Line row on GET `/inventory/department-issue?id=` (matches server `getDepartmentIssueById` lines). */
export type DepartmentIssueDetailLine = {
	id: number;
	issueId: string;
	itemId: number;
	quantity: string;
	unitId: number;
	qtyIssued: string;
	itemName?: string | null;
	unitName?: string | null;
	itemUnitMasterId?: number | null;
	itemUnitMasterConversion?: string | null;
	purchaseConversionFactor?: string | null;
	issueConversionFactor?: string | null;
	issueUnitName?: string | null;
};

/** Allocation row when issue is issued/received. */
export type DepartmentIssueAllocationRow = {
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
