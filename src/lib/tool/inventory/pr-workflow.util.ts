import { InvPrStatusTaggingEnum } from '$lib/model/enum/db-link';

export const EDITABLE_PR_STATUSES: ReadonlySet<number> = new Set([
	InvPrStatusTaggingEnum.DRAFT,
	InvPrStatusTaggingEnum.PENDING,
	InvPrStatusTaggingEnum.SENT_BACK,
	InvPrStatusTaggingEnum.REJECTED
]);

export const CANCELLABLE_PR_STATUSES: ReadonlySet<number> = new Set([
	InvPrStatusTaggingEnum.DRAFT,
	InvPrStatusTaggingEnum.PENDING,
	InvPrStatusTaggingEnum.REJECTED,
	InvPrStatusTaggingEnum.SENT_BACK
]);

export function canEditPr(statusTaggingId: number): boolean {
	return EDITABLE_PR_STATUSES.has(statusTaggingId);
}

export function canCancelPr(statusTaggingId: number): boolean {
	return CANCELLABLE_PR_STATUSES.has(statusTaggingId);
}

export function canApprovePr(statusTaggingId: number): boolean {
	return statusTaggingId === InvPrStatusTaggingEnum.PENDING;
}

export function canResubmitPr(statusTaggingId: number): boolean {
	return (
		statusTaggingId === InvPrStatusTaggingEnum.SENT_BACK ||
		statusTaggingId === InvPrStatusTaggingEnum.REJECTED
	);
}