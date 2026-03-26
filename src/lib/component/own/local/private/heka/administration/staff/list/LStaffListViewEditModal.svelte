<script lang="ts">
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';

	type StaffDialogMode = 'view' | 'edit';

	let { staffDialog, staffDialogIframeSrc, closeStaffDialog } =
		$props<{
			staffDialog: { mode: StaffDialogMode; staffId: string } | null;
			staffDialogIframeSrc: string;
			closeStaffDialog: () => void;
		}>();
</script>

{#if staffDialog}
	<DaisyUiModal
		groupName="staff-view-edit-modal"
		open={true}
		onClose={closeStaffDialog}
		className="!max-w-none !w-[100dvw] !h-[100dvh] !min-h-[100dvh]"
	>
		<div
			class="d-modal-box flex h-[96dvh] min-h-[96dvh] w-[96vw] !max-w-none flex-col gap-0 overflow-hidden p-0"
			role="document"
		>
			<div
				class="flex shrink-0 items-center justify-between border-b border-base-300 px-4 py-2"
			>
				<h2 class="text-lg font-semibold">
					{staffDialog.mode === 'view' ? 'View staff' : 'Edit staff'}
				</h2>
				<DaisyUiButton
					className="d-btn-ghost d-btn-sm d-btn-circle"
					onClick={closeStaffDialog}
				>
					<LucideX className="size-5" />
				</DaisyUiButton>
			</div>
			<iframe
				title={staffDialog.mode === 'view'
					? 'View staff'
					: 'Edit staff'}
				class="min-h-0 w-full flex-1 rounded-b-box border-0"
				src={staffDialogIframeSrc}
			></iframe>
		</div>
	</DaisyUiModal>
{/if}
