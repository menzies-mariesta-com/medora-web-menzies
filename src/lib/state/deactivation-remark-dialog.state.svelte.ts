/** Message shown above the deactivation remark field when opening the combined confirm + remark dialog. Set before opening, cleared on close. */
export const DeactivationRemarkDialogState = $state<{
	message: string | null;
}>({
	message: null
});
