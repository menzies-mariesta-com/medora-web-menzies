/** Data passed when opening "Create appointment" from the calendar grid. */
export const CreateAppointmentDialogState = $state<{
	slot: { dateString: string; timeSlot: string } | null;
	/** Selected doctor (staff) id for the appointment. */
	staffId: string | null;
	/** Selected branch id for the appointment. */
	branchId: string | null;
	/** Slot duration in minutes; used to compute toTime from timeSlot. */
	slotDurationMinutes: number;
}>({
	slot: null,
	staffId: null,
	branchId: null,
	slotDurationMinutes: 15
});
