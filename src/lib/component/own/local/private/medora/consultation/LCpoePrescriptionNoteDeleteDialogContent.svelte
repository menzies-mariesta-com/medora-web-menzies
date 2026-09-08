<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

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
		{msg.consultation_cpoe_prescription_delete_hint()}
	</p>
	<div class="flex flex-col gap-1">
		<label for="prescription-note-delete-remark" class="text-sm">
			{msg.consultation_cpoe_prescription_delete_remark_label()}
		</label>
		<WashTextarea
			id="prescription-note-delete-remark"
			className="textarea-bordered min-h-20 w-full"
			bind:value={deleteRemark}
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
			{msg.consultation_cpoe_prescription_delete_confirm()}
		</WashButton>
	</div>
</div>
