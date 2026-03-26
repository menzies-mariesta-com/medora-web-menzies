/** Set by calendar when opening "Edit block" dialog; read by LEditBlockDialogContent. */
export const EditBlockDialogState = $state<{
	blockId: number | null;
	date: string;
	startTime: string;
	endTime: string;
	remark: string;
}>({
	blockId: null,
	date: '',
	startTime: '',
	endTime: '',
	remark: ''
});
