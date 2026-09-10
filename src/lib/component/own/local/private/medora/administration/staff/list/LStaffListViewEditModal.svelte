<script lang="ts">
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';

	type StaffDialogMode = 'view' | 'edit';

	let { staffDialog, staffDialogIframeSrc, closeStaffDialog } =
		$props<{
			staffDialog: { mode: StaffDialogMode; staffId: string } | null;
			staffDialogIframeSrc: string;
			closeStaffDialog: () => void;
		}>();

	const dialogTitle = $derived(
		staffDialog?.mode === 'view' ? 'View staff' : 'Edit staff'
	);
</script>

{#if staffDialog}
	<WashDialog
		id="staff-view-edit-modal"
		open={true}
		onClose={closeStaffDialog}
		layout="fullscreen"
		title={dialogTitle}
		boxClassName="!flex min-h-0"
	>
		<iframe
			title={dialogTitle}
			class="min-h-0 w-full flex-1 rounded-b-box border-0"
			src={staffDialogIframeSrc}
		></iframe>
		{#snippet actions()}
			<WashButton variant="ghost" onClick={closeStaffDialog}>Close</WashButton>
		{/snippet}
	</WashDialog>
{/if}
