import type { InvApprovalModule } from '$lib/model/type/medora/inv-approval.type';

export type InvApprovalConfigStoreOption = {
	id: number;
	storeName: string | null;
};

export type InvApprovalStaffMatrixCell = {
	storeId: number;
	module: InvApprovalModule;
	canApprove: boolean;
};

export type InvApprovalStaffMatrixDto = {
	stores: InvApprovalConfigStoreOption[];
	modules: InvApprovalModule[];
	cells: InvApprovalStaffMatrixCell[];
};

export type InvApprovalStaffMatrixSavePayload = {
	staffId: string;
	cells: InvApprovalStaffMatrixCell[];
};
