<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	let deactivationRemark = $state('');
	let isSubmitting = $state(false);

	async function handleConfirm() {
		if (isSubmitting) return;
		isSubmitting = true;
		try {
			await confirm({ deactivationRemark: deactivationRemark.trim() });
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm text-base-content/80">
		{m.observation_emr_inactivate_hint()}
	</p>
	<div class="flex flex-col gap-1">
		<label for="allergy-deactivation-remark" class="text-sm">
			{m.observation_emr_allergy_deactivation_remark_label()}
		</label>
		<WashTextarea
			id="allergy-deactivation-remark"
			className="textarea-bordered min-h-20 w-full"
			bind:value={deactivationRemark}
		/>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<WashButton
			type="button"
			className="btn-ghost"
			disabled={isSubmitting}
			onClick={cancel}
		>
			{m.observation_emr_cancel()}
		</WashButton>
		<WashButton
			type="button"
			className="btn btn-error"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={handleConfirm}
		>
			{m.observation_emr_inactivate_confirm()}
		</WashButton>
	</div>
</div>
