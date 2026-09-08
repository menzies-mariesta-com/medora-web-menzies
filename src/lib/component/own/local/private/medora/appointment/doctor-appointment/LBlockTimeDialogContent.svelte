<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	let { confirm, cancel }: DialogSlotProps = $props();

	let date = $state('');
	let startTime = $state('');
	let endTime = $state('');
	let remark = $state('');
	let isConfirming = $state(false);

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

	async function handleConfirm() {
		if (isConfirming) return;
		const d = date.trim();
		const from = toHHmm(startTime);
		const to = toHHmm(endTime);
		const r = remark.trim();
		if (!d || !from || !to) return;
		if (!r) return;
		if (to <= from) return;
		if (isBlockStartInPast) return;
		isConfirming = true;
		try {
			await confirm({
				date: d,
				startTime: from,
				endTime: to,
				remark: r
			});
		} finally {
			isConfirming = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="block-date" class="shrink-0 sm:w-28">Date</label>
		<WashInputField
			id="block-date"
			bind:value={date}
			inputType="date"
			min={todayString}
			className="input-sm max-w-80 flex-1"
		/>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
	>
		<label for="block-remark" class="shrink-0 sm:w-28">Remark</label>
		<textarea
			id="block-remark"
			bind:value={remark}
			class="textarea-bordered textarea max-w-80 flex-1 textarea-sm"
			rows="3"
			placeholder="Why are you blocking this time?"
		></textarea>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="block-start" class="shrink-0 sm:w-28">From time</label>
		<input
			id="block-start"
			type="time"
			bind:value={startTime}
			class="input-bordered input input-sm max-w-80 flex-1"
		/>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="block-end" class="shrink-0 sm:w-28">To time</label>
		<input
			id="block-end"
			type="time"
			bind:value={endTime}
			class="input-bordered input input-sm max-w-80 flex-1"
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
		class="modal-action flex justify-end gap-2 border-t border-base-300 pt-4"
	>
		<button
			type="button"
			class="btn"
			onclick={() => cancel()}
			disabled={isConfirming}
		>
			Cancel
		</button>
		<button
			type="button"
			class="btn btn-error"
			onclick={() => handleConfirm()}
			disabled={isConfirming ||
				!date.trim() ||
				!startTime ||
				!endTime ||
				!remark.trim() ||
				toHHmm(endTime) <= toHHmm(startTime) ||
				isBlockStartInPast}
		>
			{#if isConfirming}
				<span class="inline-flex items-center gap-2">
					<span class="loading loading-spinner loading-sm"></span>
					Loading…
				</span>
			{:else}
				Block time
			{/if}
		</button>
	</div>
</div>
