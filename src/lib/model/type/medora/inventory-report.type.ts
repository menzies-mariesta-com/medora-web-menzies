/** Shared inventory report export format (API `format` query param). */
export type InventoryReportFormat = 'json' | 'csv' | 'xlsx';

export type InventoryMovementKindFilter =
	| 'GRN'
	| 'DISSUE'
	| 'DCONSUME'
	| 'all';
