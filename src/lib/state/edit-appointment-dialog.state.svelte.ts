/** Data for "Edit appointment" dialog (set by calendar before opening). */
export const EditAppointmentDialogState = $state<{
	appointmentId: number | null;
	branchId: string | null;
	slotDurationMinutes: number;
}>({ appointmentId: null, branchId: null, slotDurationMinutes: 15 });
