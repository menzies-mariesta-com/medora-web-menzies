/** IPD vs ED administration master data (unified ward/room/bed tables; `is_er` column). */
export type AdministrationMasterScope = 'ipd' | 'er';

/** User-facing scope label on master list screens (DB/API still use `is_er` / `scope=er`). */
export function masterScopeDisplayLabel(isEr: boolean | undefined): 'ED' | 'IPD' {
	return isEr ? 'ED' : 'IPD';
}

export function isErMasterScope(scope: AdministrationMasterScope): boolean {
	return scope === 'er';
}

const adminBase = (hospitalId: string) =>
	`/api/medora/hospital/${hospitalId}/home/administration`;

export function masterScopeQuery(
	scope: AdministrationMasterScope
): string {
	return scope === 'er' ? 'scope=er' : 'scope=ipd';
}

export function administrationWardMasterApi(
	hospitalId: string,
	_scope: AdministrationMasterScope
): string {
	return `${adminBase(hospitalId)}/ward-master`;
}

export function administrationWardCategoryApi(
	hospitalId: string,
	_scope: AdministrationMasterScope
): string {
	return `${adminBase(hospitalId)}/ward-master/ward-category`;
}

export function administrationRoomMasterApi(
	hospitalId: string,
	_scope: AdministrationMasterScope
): string {
	return `${adminBase(hospitalId)}/room-master`;
}

export function administrationRoomCategoryApi(
	hospitalId: string,
	_scope: AdministrationMasterScope
): string {
	return `${adminBase(hospitalId)}/room-master/room-category`;
}

export function administrationBedMasterApi(
	hospitalId: string,
	_scope: AdministrationMasterScope
): string {
	return `${adminBase(hospitalId)}/bed-master`;
}

/** Unified ward list row (API returns wardCategoryId + isEr). */
export function erWardRowAsUnified(row: {
	id: number;
	hospitalId: string;
	branchId: string;
	wardCategoryId: number;
	name: string;
	code: string | null;
	statusId: number;
	isEr?: boolean;
	branchName?: string | null;
	wardCategoryName?: string | null;
	wardMarkup?: string | null;
}) {
	return {
		...row,
		isEr: Boolean(row.isEr)
	};
}

export type UnifiedWardListRow = ReturnType<typeof erWardRowAsUnified>;

export function erRoomRowAsUnified(row: {
	id: number;
	hospitalId: string;
	wardId: number;
	roomCategoryId: number;
	name: string;
	code: string | null;
	capacity: number;
	amenities: string | null;
	statusId: number;
	isEr?: boolean;
	wardName?: string | null;
	wardCode?: string | null;
	roomCategoryName?: string | null;
	roomMarkup?: string | null;
	bedCount?: number;
}) {
	return { ...row, isEr: Boolean(row.isEr) };
}

export type UnifiedRoomListRow = ReturnType<typeof erRoomRowAsUnified>;

export function erBedRowAsUnified(row: {
	id: number;
	roomId: number;
	hospitalId: string;
	name: string;
	code: string | null;
	basePrice: string;
	bedStatus: number;
	statusId: number;
	isEr?: boolean;
	roomName?: string | null;
	roomCode?: string | null;
	wardId?: number | null;
	wardName?: string | null;
	wardCode?: string | null;
	dailyTariff?: string | null;
}) {
	return { ...row, isEr: Boolean(row.isEr) };
}

export type UnifiedBedListRow = ReturnType<typeof erBedRowAsUnified>;
