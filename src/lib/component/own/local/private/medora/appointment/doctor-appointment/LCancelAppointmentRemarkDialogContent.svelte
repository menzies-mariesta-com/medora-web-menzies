<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	let cancelRemark = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isSubmitting) return;
		const trimmed = cancelRemark.trim();
		if (!trimmed) {
			toastService.addToast(
				'Cancellation remark is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			await confirm({ cancelRemark: trimmed });
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		if (isSubmitting) return;
		cancel();
	}
</script>

<form onsubmit={handleSubmit} class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<div class="min-w-0 flex-1">
				<WashTextarea
					id="cancel-remark-dialog"
					bind:value={cancelRemark}
					placeholder="Reason for cancelling this appointment"
					className="w-full"
				/>
			</div>
		</div>
	</div>
	<WashDialogFooter>
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={handleCancel}
			disabled={isSubmitting}
		>
			Cancel
		</WashButton>
		<WashButton
			type="submit"
			className="btn-primary"
			loading={isSubmitting}
		>
			Continue
		</WashButton>
	</WashDialogFooter>
</form>
