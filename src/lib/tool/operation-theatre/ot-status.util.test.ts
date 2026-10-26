import { describe, expect, it } from 'vitest';
import { OtBookingStatusTaggingEnum } from '$lib/model/enum/db-link';
import {
	canTransitionOtStatus,
	schedulerRowForTime,
	schedulerRowSpan,
	schedulerTimeSlots,
	OT_SCHEDULER_SLOT_MINUTES,
	OT_SCHEDULER_START_HOUR,
	OT_SCHEDULER_END_HOUR
} from '$lib/tool/operation-theatre/ot-status.util';

describe('schedulerTimeSlots', () => {
	it('covers 08:00 through 23:30 inclusive at 30-minute intervals', () => {
		const slots = schedulerTimeSlots();
		expect(slots[0]).toBe('08:00');
		expect(slots.at(-1)).toBe('23:30');
		expect(slots).toHaveLength(32);
		expect(OT_SCHEDULER_SLOT_MINUTES).toBe(30);
		expect(OT_SCHEDULER_START_HOUR).toBe(8);
		expect(OT_SCHEDULER_END_HOUR).toBe(23.5);
	});
});

describe('scheduler grid helpers', () => {
	it('maps the first and last slot to grid rows', () => {
		expect(schedulerRowForTime('08:00')).toBe(1);
		expect(schedulerRowForTime('08:30')).toBe(2);
		expect(schedulerRowForTime('23:30')).toBe(32);
	});

	it('spans one row per started 30-minute block', () => {
		expect(schedulerRowSpan('08:00', '08:30')).toBe(1);
		expect(schedulerRowSpan('08:00', '09:00')).toBe(2);
		expect(schedulerRowSpan('08:00', '09:15')).toBe(3);
		expect(schedulerRowSpan('08:00', '08:05')).toBe(1);
	});
});

describe('canTransitionOtStatus', () => {
	it('allows forward booking transitions', () => {
		expect(
			canTransitionOtStatus(
				OtBookingStatusTaggingEnum.UNCONFIRMED,
				OtBookingStatusTaggingEnum.CONFIRMED
			)
		).toBe(true);
		expect(
			canTransitionOtStatus(
				OtBookingStatusTaggingEnum.CONFIRMED,
				OtBookingStatusTaggingEnum.OT_PAC
			)
		).toBe(true);
		expect(
			canTransitionOtStatus(
				OtBookingStatusTaggingEnum.OT_PAC,
				OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP
			)
		).toBe(true);
		expect(
			canTransitionOtStatus(
				OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP,
				OtBookingStatusTaggingEnum.POST_OP
			)
		).toBe(true);
	});

	it('allows abort before the case is completed', () => {
		expect(
			canTransitionOtStatus(
				OtBookingStatusTaggingEnum.CONFIRMED,
				OtBookingStatusTaggingEnum.ABORTED
			)
		).toBe(true);
	});

	it('blocks backward, same, and post-completion transitions', () => {
		expect(
			canTransitionOtStatus(
				OtBookingStatusTaggingEnum.CONFIRMED,
				OtBookingStatusTaggingEnum.UNCONFIRMED
			)
		).toBe(false);
		expect(
			canTransitionOtStatus(
				OtBookingStatusTaggingEnum.CONFIRMED,
				OtBookingStatusTaggingEnum.CONFIRMED
			)
		).toBe(false);
		expect(
			canTransitionOtStatus(
				OtBookingStatusTaggingEnum.POST_OP,
				OtBookingStatusTaggingEnum.ABORTED
			)
		).toBe(false);
		expect(
			canTransitionOtStatus(
				OtBookingStatusTaggingEnum.ABORTED,
				OtBookingStatusTaggingEnum.CONFIRMED
			)
		).toBe(false);
	});
});
