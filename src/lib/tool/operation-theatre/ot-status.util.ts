import { OtBookingStatusTaggingEnum } from '$lib/model/enum/db-link';

export type OtStatusTone =
	| 'warning'
	| 'primary'
	| 'info'
	| 'accent'
	| 'success'
	| 'error'
	| 'neutral';

export type OtStatusView = {
	id: number;
	code: string;
	label: string;
	shortLabel: string;
	tone: OtStatusTone;
	blockClass: string;
	badgeClass: string;
};

export const OT_STATUS_VIEWS: OtStatusView[] = [
	{
		id: OtBookingStatusTaggingEnum.UNCONFIRMED,
		code: 'ot_unconfirmed',
		label: 'Unconfirmed',
		shortLabel: 'UnConf',
		tone: 'warning',
		blockClass: 'bg-warning text-warning-content border-warning',
		badgeClass: 'badge-warning'
	},
	{
		id: OtBookingStatusTaggingEnum.CONFIRMED,
		code: 'ot_confirmed',
		label: 'Confirmed',
		shortLabel: 'Confir',
		tone: 'primary',
		blockClass: 'bg-primary text-primary-content border-primary',
		badgeClass: 'badge-primary'
	},
	{
		id: OtBookingStatusTaggingEnum.OT_PAC,
		code: 'ot_pac',
		label: 'OT-PAC',
		shortLabel: 'OT-PAC',
		tone: 'info',
		blockClass: 'bg-info text-info-content border-info',
		badgeClass: 'badge-info'
	},
	{
		id: OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP,
		code: 'ot_check_in_pre_op',
		label: 'Checked-In/Pre-Op',
		shortLabel: 'Chk-In/Pre-Op',
		tone: 'accent',
		blockClass: 'bg-accent text-accent-content border-accent',
		badgeClass: 'badge-accent'
	},
	{
		id: OtBookingStatusTaggingEnum.POST_OP,
		code: 'ot_post_op',
		label: 'Post-Op',
		shortLabel: 'Post',
		tone: 'success',
		blockClass: 'bg-success text-success-content border-success',
		badgeClass: 'badge-success'
	},
	{
		id: OtBookingStatusTaggingEnum.ABORTED,
		code: 'ot_aborted',
		label: 'OT Abort',
		shortLabel: 'OT Abort',
		tone: 'error',
		blockClass: 'bg-error text-error-content border-error',
		badgeClass: 'badge-error'
	}
];

export function otStatusById(
	id: number | null | undefined
): OtStatusView {
	return (
		OT_STATUS_VIEWS.find((s) => s.id === Number(id)) ??
		OT_STATUS_VIEWS[0]!
	);
}

export function otStatusByCode(
	code: string | null | undefined
): OtStatusView {
	const norm = String(code ?? '')
		.trim()
		.toLowerCase();
	return (
		OT_STATUS_VIEWS.find((s) => s.code === norm) ??
		OT_STATUS_VIEWS[0]!
	);
}

export const OT_BOOKING_STATUS_IDS = OT_STATUS_VIEWS.map((s) => s.id);

/** Allowed forward transitions; abort is handled separately. */
export const OT_STATUS_TRANSITIONS: Record<number, number[]> = {
	[OtBookingStatusTaggingEnum.UNCONFIRMED]: [
		OtBookingStatusTaggingEnum.CONFIRMED,
		OtBookingStatusTaggingEnum.ABORTED
	],
	[OtBookingStatusTaggingEnum.CONFIRMED]: [
		OtBookingStatusTaggingEnum.OT_PAC,
		OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP,
		OtBookingStatusTaggingEnum.ABORTED
	],
	[OtBookingStatusTaggingEnum.OT_PAC]: [
		OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP,
		OtBookingStatusTaggingEnum.ABORTED
	],
	[OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP]: [
		OtBookingStatusTaggingEnum.POST_OP,
		OtBookingStatusTaggingEnum.ABORTED
	],
	[OtBookingStatusTaggingEnum.POST_OP]: [],
	[OtBookingStatusTaggingEnum.ABORTED]: []
};

export function canTransitionOtStatus(
	from: number,
	to: number
): boolean {
	if (from === to) return false;
	return (OT_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export const OT_SCHEDULER_START_HOUR = 8;
export const OT_SCHEDULER_END_HOUR = 23.5;
export const OT_SCHEDULER_SLOT_MINUTES = 30;

export function schedulerTimeSlots(): string[] {
	const slots: string[] = [];
	for (
		let minutes = OT_SCHEDULER_START_HOUR * 60;
		minutes <= OT_SCHEDULER_END_HOUR * 60;
		minutes += OT_SCHEDULER_SLOT_MINUTES
	) {
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		slots.push(
			`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
		);
	}
	return slots;
}

/** 1-based grid row for a local HH:mm value. */
export function schedulerRowForTime(hhmm: string): number {
	const [h, m] = String(hhmm || '0:0')
		.split(':')
		.map((v) => Number(v));
	const minutes = (h || 0) * 60 + (m || 0);
	const offset = minutes - OT_SCHEDULER_START_HOUR * 60;
	return Math.max(
		1,
		Math.floor(offset / OT_SCHEDULER_SLOT_MINUTES) + 1
	);
}

/** Number of 30-minute rows a booking spans. */
export function schedulerRowSpan(start: string, end: string): number {
	const [sh, sm] = String(start || '0:0')
		.split(':')
		.map((v) => Number(v));
	const [eh, em] = String(end || '0:0')
		.split(':')
		.map((v) => Number(v));
	const startMin = (sh || 0) * 60 + (sm || 0);
	const endMin = (eh || 0) * 60 + (em || 0);
	const span = Math.ceil(
		Math.max(OT_SCHEDULER_SLOT_MINUTES, endMin - startMin) /
			OT_SCHEDULER_SLOT_MINUTES
	);
	return Math.max(1, span);
}

export function formatOtTime(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function localHhmm(iso: string | null | undefined): string {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatOtDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: '2-digit'
	});
}

export function localDateString(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
