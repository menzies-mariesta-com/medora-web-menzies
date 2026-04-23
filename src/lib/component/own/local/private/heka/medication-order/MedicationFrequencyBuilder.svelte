<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		kind = $bindable('prn'),
		config = $bindable<Record<string, unknown>>({}),
		summaryText = $bindable('')
	} = $props();

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
		/** Hydrate local fields from `config` / `kind` (e.g. admin edit) */
		if (kind === 'fixed_times') {
			if (Array.isArray(config?.times) && (config!.times as unknown[]).length) {
				timesText = (config!.times as string[]).join(', ');
			} else if (!timesText) {
				timesText = '08:00, 20:00';
			}
		} else if (kind === 'interval') {
			intervalHours = String(
				(config as { everyHours?: number }).everyHours ?? 6
			);
		} else if (kind === 'custom') {
			customNote = String((config as { note?: string }).note ?? '');
		}
	});

	function applyKind(next: string) {
		kind = next;
		if (next === 'prn') {
			config = {};
		} else if (next === 'fixed_times') {
			const parts = parseTimesString(timesText);
			config = {
				times: parts.length ? parts : ['08:00', '20:00']
			};
			timesText = (config.times as string[]).join(', ');
		} else if (next === 'interval') {
			const n = Number(intervalHours) || 6;
			intervalHours = String(n);
			config = { everyHours: n };
		} else {
			config = { note: customNote };
		}
	}

	function applyTemplateBd() {
		kind = 'fixed_times';
		timesText = '08:00, 20:00';
		config = { times: ['08:00', '20:00'] };
	}

	function applyTemplateQ6h() {
		kind = 'interval';
		intervalHours = '6';
		config = { everyHours: 6 };
	}

	function onTimesInput() {
		const parts = parseTimesString(timesText);
		config = { times: parts.length ? parts : ['08:00', '20:00'] };
	}

	function onIntervalInput() {
		const n = Number(intervalHours);
		const v = Number.isFinite(n) && n > 0 ? n : 6;
		intervalHours = String(v);
		config = { everyHours: v };
	}

	function onCustomInput() {
		config = { note: customNote };
	}
</script>

<div class="flex flex-col gap-3 rounded-box border border-base-300 p-3">
	<div class="flex flex-wrap gap-2">
		<span class="text-sm font-medium">{m.med_order_freq_kind_label()}</span>
		<select
			class="d-select d-select-bordered d-select-sm max-w-xs"
			value={kind}
			onchange={(e) =>
				applyKind((e.currentTarget as HTMLSelectElement).value)}
		>
			<option value="prn">{m.med_order_freq_kind_prn()}</option>
			<option value="fixed_times"
				>{m.med_order_freq_kind_fixed_times()}</option
			>
			<option value="interval">{m.med_order_freq_kind_interval()}</option>
			<option value="custom">{m.med_order_freq_kind_custom()}</option>
		</select>
	</div>

	<div class="flex flex-wrap gap-2">
		<DaisyUiButton
			type="button"
			className="d-btn d-btn-ghost d-btn-xs"
			onClick={applyTemplateBd}
		>
			{m.med_order_freq_template_bd()}
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="d-btn d-btn-ghost d-btn-xs"
			onClick={applyTemplateQ6h}
		>
			{m.med_order_freq_template_q6h()}
		</DaisyUiButton>
	</div>

	{#if kind === 'fixed_times'}
		<DaisyUiInputField
			nameText={m.med_order_freq_times_label()}
			bind:value={timesText}
			oninput={onTimesInput}
		/>
		<p class="text-xs text-base-content/70">
			{m.med_order_freq_times_hint()}
		</p>
	{:else if kind === 'interval'}
		<DaisyUiInputField
			nameText={m.med_order_freq_hours_label()}
			inputType="number"
			min="1"
			step="1"
			bind:value={intervalHours}
			oninput={onIntervalInput}
		/>
	{:else if kind === 'custom'}
		<DaisyUiInputField
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