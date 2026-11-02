import { eq, type Column } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

/**
 * Paginated master-data lists: never include DELETED rows; default to ACTIVE when no filter.
 */
export function paginatedEntityStatusEq(
	statusColumn: Column,
	statusId?: number | null
) {
	if (typeof statusId === 'number' && Number.isFinite(statusId)) {
		return eq(statusColumn, statusId);
	}
	return eq(statusColumn, StatusEnum.ACTIVE);
}

export function parsePaginationStatusIdParam(
	raw: string | null | undefined
): number | undefined {
	if (raw == null || raw.trim() === '') return undefined;
	const n = Number(raw);
	return Number.isFinite(n) ? n : undefined;
}

/** SearchSelect / WashSelect / dropdown option lists: active rows only. */
export function activeEntityStatusEq(statusColumn: Column) {
	return eq(statusColumn, StatusEnum.ACTIVE);
}
