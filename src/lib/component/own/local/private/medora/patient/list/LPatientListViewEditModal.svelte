<script lang="ts">
	import WashModal from '$lib/component/wash/modal/WashModal.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';

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
	<WashModal
		groupName="patient-view-edit-modal"
		open={true}
		onClose={closePatientDialog}
		className="!max-w-none !w-[100dvw] !h-[100dvh] !min-h-[100dvh]"
	>
		<div
			class="modal-box flex h-[96dvh] min-h-[96dvh] w-[96vw] !max-w-none flex-col gap-0 overflow-hidden p-0"
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
				<WashButton
					className="btn-ghost btn-sm btn-circle"
					onClick={closePatientDialog}
				>
					<LucideX className="size-5" />
				</WashButton>
			</div>
			<iframe
				title={patientDialog.mode === 'view'
					? 'View patient'
					: 'Edit patient'}
				class="min-h-0 w-full flex-1 rounded-b-box border-0"
				src={patientDialogIframeSrc}
			></iframe>
		</div>
	</WashModal>
{/if}
