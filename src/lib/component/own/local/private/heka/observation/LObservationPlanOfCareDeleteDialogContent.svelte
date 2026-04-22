<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	let deleteRemark = $state('');
	let isSubmitting = $state(false);

	async function handleConfirm() {
		if (isSubmitting) return;
		isSubmitting = true;
		try {
			await confirm({ deleteRemark: deleteRemark.trim() });
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm text-base-content/80">
		{m.observation_emr_plan_of_care_delete_hint()}
	</p>
	<div class="flex flex-col gap-1">
		<DaisyUiLabel forText="plan-of-care-delete-remark" className="text-sm">
			{m.observation_emr_plan_of_care_delete_remark_label()}
		</DaisyUiLabel>
		<DaisyUiTextarea
			id="plan-of-care-delete-remark"
			className="d-textarea-bordered min-h-20 w-full"
			bind:value={deleteRemark}
		/>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<DaisyUiButton
			type="button"
			className="d-btn-ghost"
			disabled={isSubmitting}
			onClick={cancel}
		>
			{m.observation_emr_cancel()}
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="d-btn d-btn-error"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={handleConfirm}
		>
			{m.observation_emr_plan_of_care_delete_confirm()}
		</DaisyUiButton>
	</div>
</div>
