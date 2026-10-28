import { eq, type SQL } from 'drizzle-orm';

/** Filter master rows by ER vs IPD scope (`is_er` column). Omit for both. */
export function isErScopeCondition(
	column: { isEr: Parameters<typeof eq>[0] },
	isEr?: boolean
): SQL | undefined {
	if (isEr === true) return eq(column.isEr, true);
	if (isEr === false) return eq(column.isEr, false);
	return undefined;
}

export function isErFromScopeQuery(
	scope: string | null
): boolean | undefined {
	if (scope === 'er') return true;
	if (scope === 'ipd') return false;
	return undefined;
}

/** Ward/room/bed pickers (`active=1`, `free=1`) default to IPD when scope is omitted. */
export function isErForMasterPicker(scope: string | null): boolean {
	return isErFromScopeQuery(scope) ?? false;
}
