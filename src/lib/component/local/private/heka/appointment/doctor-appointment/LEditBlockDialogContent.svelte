<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import { EditBlockDialogState } from '$lib/state/edit-block-dialog.state.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const blockId = $derived(EditBlockDialogState.blockId);

	let date = $state('');
	let startTime = $state('');
	let endTime = $state('');

	$effect(() => {
		date = EditBlockDialogState.date;
		startTime = EditBlockDialogState.startTime;
		endTime = EditBlockDialogState.endTime;
	});

	function toHHmm(s: string): string {
		if (!s) return '';
		const parts = String(s).trim().split(':');
		const h = parts[0]
			? String(Number(parts[0])).padStart(2, '0')
			: '00';
		const m = parts[1]
			? String(Number(parts[1])).padStart(2, '0')
			: '00';
		return `${h}:${m}`;
	}

	const todayString = $derived.by(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	});

	const isBlockStartInPast = $derived.by(() => {
		const d = date.trim();
		const from = toHHmm(startTime);
		if (!d || !from) return false;
		const slotStart = new Date(d + 'T' + from);
		return (
			isNaN(slotStart.getTime()) || slotStart.getTime() < Date.now()
		);
	});

	function handleConfirm() {
		const d = date.trim();
		const from = toHHmm(startTime);
		const to = toHHmm(endTime);
		if (!d || !from || !to || blockId == null) return;
		if (to <= from) return;
		if (isBlockStartInPast) return;
		confirm({ id: blockId, date: d, startTime: from, endTime: to });
	}
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel
			forText="edit-block-date"
			className="shrink-0 sm:w-28">Date</DaisyUiLabel
		>
		<input
			id="edit-block-date"
			type="date"
			bind:value={date}
			min={todayString}
			class="d-input-bordered d-input d-input-sm max-w-80 flex-1"
		/>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel
			forText="edit-block-start"
			className="shrink-0 sm:w-28">From time</DaisyUiLabel
		>
		<input
			id="edit-block-start"
			type="time"
			bind:value={startTime}
			class="d-input-bordered d-input d-input-sm max-w-80 flex-1"
		/>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel
			forText="edit-block-end"
			className="shrink-0 sm:w-28">To time</DaisyUiLabel
		>
		<input
			id="edit-block-end"
			type="time"
			bind:value={endTime}
			class="d-input-bordered d-input d-input-sm max-w-80 flex-1"
		/>
	</div>
	{#if isBlockStartInPast}
		<p class="text-sm text-error">
			Cannot set block time in the past.
		</p>
	{/if}
	<div
		class="d-modal-action flex justify-end gap-2 border-t border-base-300 pt-4"
	>
		<button type="button" class="d-btn" onclick={() => cancel()}
			>Cancel</button
		>
		<button
			type="button"
			class="d-btn d-btn-error"
			onclick={() => handleConfirm()}
			disabled={!date.trim() ||
				!startTime ||
				!endTime ||
				toHHmm(endTime) <= toHHmm(startTime) ||
				isBlockStartInPast}>Save</button
		>
	</div>
</div>
