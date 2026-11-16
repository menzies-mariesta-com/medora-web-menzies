export type GlobalDocumentLinkRow = {
	id: number;
	code: string | null;
	documentNumber: string | null;
	locale: string | null;
	clinicalSection: string | null;
	statusId: number | null;
	linked: boolean;
	hospitalDocumentId: number | null;
	documentTypeId: number | null;
	documentSettingId: number | null;
};

export type GlobalDocumentLinkListResponse = {
	data: GlobalDocumentLinkRow[];
	total: number;
	page: number;
	pageSize: number;
};

export type GlobalDocumentPreview = GlobalDocumentLinkRow & {
	documentText: string | null;
};
