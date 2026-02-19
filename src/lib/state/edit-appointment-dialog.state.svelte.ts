/** Data for "Edit appointment" dialog (set by calendar before opening). */
export const EditAppointmentDialogState = $state<{
	appointmentId: number | null;
	slotDurationMinutes: number;
}>({ appointmentId: null, slotDurationMinutes: 15 });
