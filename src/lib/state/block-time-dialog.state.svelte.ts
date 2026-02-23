/** Set by calendar when opening "Block time" dialog; read by LBlockTimeDialogContent for time options. */
export const BlockTimeDialogState = $state<{
	slotDurationMinutes: number;
}>({ slotDurationMinutes: 15 });
