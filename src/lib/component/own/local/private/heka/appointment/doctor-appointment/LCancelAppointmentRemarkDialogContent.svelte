<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	let cancelRemark = $state('');

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = cancelRemark.trim();
		if (!trimmed) {
			toastService.addToast(
				'Cancellation remark is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		confirm({ cancelRemark: trimmed });
	}

	function handleCancel() {
		cancel();
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
	>
		<div class="min-w-0 flex-1">
			<DaisyUiTextarea
				id="cancel-remark-dialog"
				bind:value={cancelRemark}
				placeholder="Reason for cancelling this appointment"
				className="w-full"
			/>
		</div>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<DaisyUiButton
			type="button"
			className="d-btn-ghost"
			onClick={handleCancel}
		>
			Cancel
		</DaisyUiButton>
		<DaisyUiButton type="submit" className="d-btn-primary">
			Continue
		</DaisyUiButton>
	</div>
</form>
