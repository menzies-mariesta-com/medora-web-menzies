<script lang="ts">
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import { m } from '$lib/paraglide/messages';

	export let open: boolean;
	export let cancelReason: string;
	export let submitting: boolean;
	export let onClose: () => void;
	export let onConfirm: () => void;
</script>

<DaisyUiModal
	groupName="cancel-pr-dialog"
	{open}
	onClose={() => onClose()}
	className="d-modal-middle"
>
	<div class="d-modal-box max-w-md" role="document">
		<h3 class="text-lg font-bold">{m.inv_pr_cancel()}</h3>
		<p class="text-sm py-2 opacity-80">{m.inv_pr_cancel_reason_prompt()}</p>
		<textarea
			class="d-textarea-bordered d-textarea w-full"
			rows="3"
			bind:value={cancelReason}
			aria-label={m.inv_pr_cancel_reason_prompt()}
		></textarea>
		<div class="d-modal-action mt-4">
			<DaisyUiButton className="d-btn" disabled={submitting} onClick={() => onClose()}>
				{m.cancel()}
			</DaisyUiButton>
			<DaisyUiButton className="d-btn d-btn-error" disabled={submitting} onClick={() => onConfirm()}>
				{m.inv_pr_cancel_confirm()}
			</DaisyUiButton>
		</div>
	</div>
</DaisyUiModal>

