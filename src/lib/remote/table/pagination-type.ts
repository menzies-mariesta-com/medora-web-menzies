/**
 * Shared result type for paginated queries across remote tables.
 */
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
	/** Optional search term for list endpoints (e.g. staff list). */
	search?: string;
	/** Optional hospital id to scope list data (e.g. under /heka/hospital/[id]/home/). */
	hospitalId?: number;
	/** Optional cache-busting key; when set, bypasses client cache (e.g. after edit). */
	_t?: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * Normalize pagination params: page >= 1, pageSize in [1, MAX_PAGE_SIZE].
 */
export function normalizePagination(params?: PaginationParams): {
	page: number;
	pageSize: number;
	limit: number;
	offset: number;
} {
	const page = Math.max(1, params?.page ?? DEFAULT_PAGE);
	const pageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, params?.pageSize ?? DEFAULT_PAGE_SIZE));
	const offset = (page - 1) * pageSize;
	return { page, pageSize, limit: pageSize, offset };
}
