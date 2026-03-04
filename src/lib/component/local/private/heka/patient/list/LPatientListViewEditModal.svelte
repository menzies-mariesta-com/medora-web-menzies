<script lang="ts">
	import DaisyUiModal from '$lib/component/library/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';

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
</script>

{#if patientDialog}
	<DaisyUiModal
		groupName="patient-view-edit-modal"
		open={true}
		onClose={closePatientDialog}
		className="!max-w-none !w-[100vw] !h-[100dvh] !min-h-[100dvh]"
	>
		<div
			class="d-modal-box flex h-[96dvh] min-h-[96dvh] w-[96vw] !max-w-none flex-col gap-0 overflow-hidden p-0"
			role="document"
		>
			<div
				class="flex shrink-0 items-center justify-between border-b border-base-300 px-4 py-2"
			>
				<h2 class="text-lg font-semibold">
					{patientDialog.mode === 'view'
						? 'View patient'
						: 'Edit patient'}
				</h2>
				<DaisyUiButton
					className="d-btn-ghost d-btn-sm d-btn-circle"
					onClick={closePatientDialog}
				>
					<LucideX className="size-5" />
				</DaisyUiButton>
			</div>
			<iframe
				title={patientDialog.mode === 'view'
					? 'View patient'
					: 'Edit patient'}
				class="min-h-0 w-full flex-1 rounded-b-box border-0"
				src={patientDialogIframeSrc}
			></iframe>
		</div>
	</DaisyUiModal>
{/if}
