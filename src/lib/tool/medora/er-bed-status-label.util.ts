import { IpdBedStatusEnum } from '$lib/model/enum/db-link';

/** ER beds use vacant/occupied labels in UI (maps IPD FREE/OCCUPIED). */
export function erBedStatusLabel(
	bedStatus: number,
	labels?: { vacant: string; occupied: string }
): string {
	const vacant = labels?.vacant ?? 'Vacant';
	const occupied = labels?.occupied ?? 'Occupied';
	if (bedStatus === IpdBedStatusEnum.OCCUPIED) return occupied;
	if (bedStatus === IpdBedStatusEnum.FREE) return vacant;
	return String(bedStatus);
}

export function erBedStatusBadgeClass(bedStatus: number): string {
	if (bedStatus === IpdBedStatusEnum.OCCUPIED) return 'badge-warning';
	if (bedStatus === IpdBedStatusEnum.FREE) return 'badge-success';
	return 'badge-ghost';
}
