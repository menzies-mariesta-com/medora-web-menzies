<script lang="ts">
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';

	type PatientDialogMode = 'view' | 'edit';

	let { patientDialog, patientDialogIframeSrc, closePatientDialog } =
		$props<{
			patientDialog: {
				mode: PatientDialogMode;
				patientId: string;
			} | null;
			patientDialogIframeSrc: string;
			closePatientDialog: () => void;
		}>();

	const dialogTitle = $derived(
		patientDialog?.mode === 'view' ? 'View patient' : 'Edit patient'
	);
</script>

{#if patientDialog}
	<WashDialog
		id="patient-view-edit-modal"
		open={true}
		onClose={closePatientDialog}
		layout="fullscreen"
		title={dialogTitle}
		boxClassName="!flex min-h-0"
	>
		<iframe
			title={dialogTitle}
			class="min-h-0 w-full flex-1 rounded-b-box border-0"
			src={patientDialogIframeSrc}
		></iframe>
		{#snippet actions()}
			<WashButton variant="ghost" onClick={closePatientDialog}>Close</WashButton>
		{/snippet}
	</WashDialog>
{/if}
