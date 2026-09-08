<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { m } from '$lib/paraglide/messages';

	let { kind = $bindable('prn'), summaryText = $bindable('') } =
		$props();

	/** Local editors (freq row load / user edit) */
	let timesText = $state('');
	let intervalHours = $state('6');
	let customNote = $state('');

	function parseTimesString(s: string): string[] {
		return s
			.split(',')
			.map((x) => x.trim())
			.filter(Boolean);
	}

	const preview = $derived.by(() => {
		if (kind === 'prn') return m.med_order_freq_summary_prn();
		if (kind === 'fixed_times') {
			const parts = parseTimesString(timesText);
			const label = parts.length
				? parts.join(', ')
				: m.med_order_freq_times_placeholder();
			return m.med_order_freq_summary_fixed() + ' ' + label;
		}
		if (kind === 'interval') {
			const h = intervalHours.trim() || '?';
			return m.med_order_freq_summary_interval() + ' ' + h;
		}
		const n = customNote.trim();
		return n || m.med_order_freq_summary_custom_empty();
	});

	$effect(() => {
		summaryText = preview;
	});

	$effect(() => {
		/** Hydrate local fields from `kind` (e.g. admin edit) */
		if (kind === 'fixed_times') {
			if (!timesText) {
				timesText = '08:00, 20:00';
			}
		} else if (kind === 'interval') {
			if (!intervalHours) intervalHours = '6';
		} else if (kind === 'custom') {
			// keep local input
		}
	});

	function applyKind(next: string) {
		kind = next;
		if (next === 'fixed_times' && !timesText)
			timesText = '08:00, 20:00';
		if (next === 'interval' && !intervalHours) intervalHours = '6';
	}

	function applyTemplateBd() {
		kind = 'fixed_times';
		timesText = '08:00, 20:00';
	}

	function applyTemplateQ6h() {
		kind = 'interval';
		intervalHours = '6';
	}

	function onTimesInput() {
		// summaryText is derived; no persisted config
	}

	function onIntervalInput() {
		const n = Number(intervalHours);
		const v = Number.isFinite(n) && n > 0 ? n : 6;
		intervalHours = String(v);
	}

	function onCustomInput() {
		// summaryText is derived; no persisted config
	}
</script>

<div
	class="flex flex-col gap-3 rounded-box border border-base-300 p-3"
>
	<div class="flex flex-wrap gap-2">
		<span class="text-sm font-medium"
			>{m.med_order_freq_kind_label()}</span
		>
		<select
			class="select-bordered select max-w-xs select-sm"
			value={kind}
			onchange={(e) =>
				applyKind((e.currentTarget as HTMLSelectElement).value)}
		>
			<option value="prn">{m.med_order_freq_kind_prn()}</option>
			<option value="fixed_times"
				>{m.med_order_freq_kind_fixed_times()}</option
			>
			<option value="interval"
				>{m.med_order_freq_kind_interval()}</option
			>
			<option value="custom">{m.med_order_freq_kind_custom()}</option>
		</select>
	</div>

	<div class="flex flex-wrap gap-2">
		<WashButton
			type="button"
			className="btn btn-ghost btn-xs"
			onClick={applyTemplateBd}
		>
			{m.med_order_freq_template_bd()}
		</WashButton>
		<WashButton
			type="button"
			className="btn btn-ghost btn-xs"
			onClick={applyTemplateQ6h}
		>
			{m.med_order_freq_template_q6h()}
		</WashButton>
	</div>

	{#if kind === 'fixed_times'}
		<WashInputField
			nameText={m.med_order_freq_times_label()}
			bind:value={timesText}
			oninput={onTimesInput}
		/>
		<p class="text-xs text-base-content/70">
			{m.med_order_freq_times_hint()}
		</p>
	{:else if kind === 'interval'}
		<WashInputField
			nameText={m.med_order_freq_hours_label()}
			inputType="number"
			min="1"
			step="1"
			bind:value={intervalHours}
			oninput={onIntervalInput}
		/>
	{:else if kind === 'custom'}
		<WashInputField
			nameText={m.med_order_freq_custom_note()}
			bind:value={customNote}
			oninput={onCustomInput}
		/>
	{/if}

	<div class="rounded bg-base-200/60 px-3 py-2 text-sm">
		<span class="font-medium">{m.med_order_freq_preview()}</span>
		{preview}
	</div>
</div>
