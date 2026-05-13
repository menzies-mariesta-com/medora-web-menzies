export type PaginatedResult<T> = {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export type PaginationParams = {
	page?: number;
	pageSize?: number;
	search?: string;
	staffCode?: string;
	staffName?: string;
	staffPhonePrimary?: string;
	patientCode?: string;
	patientName?: string;
	patientPhonePrimary?: string;
	name?: string;
	code?: string;
	itemCode?: string;
	statusId?: number;
	hospitalId?: string;
	branchId?: string;
	categoryId?: number;
	_t?: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export function normalizePagination(params?: PaginationParams): {
	page: number;
	pageSize: number;
	limit: number;
	offset: number;
} {
	const page = Math.max(1, params?.page ?? DEFAULT_PAGE);
	const pageSize = Math.max(
		1,
		Math.min(MAX_PAGE_SIZE, params?.pageSize ?? DEFAULT_PAGE_SIZE)
	);
	const offset = (page - 1) * pageSize;
	return { page, pageSize, limit: pageSize, offset };
}
