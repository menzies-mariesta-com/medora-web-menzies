<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	let date = $state('');
	let startTime = $state('');
	let endTime = $state('');
	let remark = $state('');

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

	/** Today in local YYYY-MM-DD for date input min. */
	const todayString = $derived.by(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	});

	/** True if the block start (date + startTime) is in the past — same rule as booking appointments. */
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
		const r = remark.trim();
		if (!d || !from || !to) return;
		if (!r) return;
		if (to <= from) return;
		if (isBlockStartInPast) return;
		confirm({ date: d, startTime: from, endTime: to, remark: r });
	}
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="block-date" className="shrink-0 sm:w-28"
			>Date</DaisyUiLabel
		>
		<DaisyUiInputField
			id="block-date"
			bind:value={date}
			inputType="date"
			min={todayString}
			className="d-input-sm max-w-80 flex-1"
		/>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
	>
		<DaisyUiLabel forText="block-remark" className="shrink-0 sm:w-28"
			>Remark</DaisyUiLabel
		>
		<textarea
			id="block-remark"
			bind:value={remark}
			class="d-textarea-bordered d-textarea max-w-80 flex-1 d-textarea-sm"
			rows="3"
			placeholder="Why are you blocking this time?"
		></textarea>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="block-start" className="shrink-0 sm:w-28"
			>From time</DaisyUiLabel
		>
		<input
			id="block-start"
			type="time"
			bind:value={startTime}
			class="d-input-bordered d-input d-input-sm max-w-80 flex-1"
		/>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="block-end" className="shrink-0 sm:w-28"
			>To time</DaisyUiLabel
		>
		<input
			id="block-end"
			type="time"
			bind:value={endTime}
			class="d-input-bordered d-input d-input-sm max-w-80 flex-1"
		/>
	</div>
	<p class="text-sm opacity-80">
		Blocked time will be shown on the calendar; no appointments can be
		made in that range.
	</p>
	{#if isBlockStartInPast}
		<p class="text-sm text-error">Cannot block time in the past.</p>
	{/if}
	<div
		class="d-modal-action flex justify-end gap-2 border-t border-base-300 pt-4"
	>
		<button type="button" class="d-btn" onclick={() => cancel()}>
			Cancel
		</button>
		<button
			type="button"
			class="d-btn d-btn-error"
			onclick={() => handleConfirm()}
			disabled={!date.trim() ||
				!startTime ||
				!endTime ||
				!remark.trim() ||
				toHHmm(endTime) <= toHHmm(startTime) ||
				isBlockStartInPast}
		>
			Block time
		</button>
	</div>
</div>
