<script lang="ts">
	/**
	 * Soft Wash text input. Date / time / datetime-local use WashDatePicker and
	 * WashTimePicker (dropdown + calendar / analog clock), not native browser pickers.
	 */
	import WashDatePicker from '$lib/component/wash/datepicker/WashDatePicker.svelte';
	import WashTimePicker from '$lib/component/wash/timepicker/WashTimePicker.svelte';
	import { normalizeTime } from '$lib/util/wash-calendar-date.util';

	let {
		id,
		className,
		inputPlaceholderText,
		inputType,
		inputPattern,
		inputTitle,
		minLength,
		maxlength,
		min,
		max,
		step,
		nameText,
		value = $bindable(),
		ariaLabel,
		rawStyle,
		checked,
		hidden,
		disabled,
		required,
		onClick,
		oninput
	} = $props<{
		id?: string;
		className?: string;
		inputPlaceholderText?: string;
		inputType?: string;
		inputPattern?: string;
		inputTitle?: string;
		minLength?: number;
		maxlength?: number;
		min?: string;
		max?: string;
		step?: string;
		nameText?: string;
		value?: string;
		ariaLabel?: string;
		rawStyle?: boolean;
		checked?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		required?: boolean;
		onClick?: () => void;
		oninput?: (e: Event) => void;
	}>();

	const isDateField = $derived(inputType === 'date');
	const isDateTimeField = $derived(inputType === 'datetime-local');
	const isTimeField = $derived(inputType === 'time');
	const isWashPicker = $derived(
		isDateField || isDateTimeField || isTimeField
	);

	/** Native inputs are skipped by Design overflow marquee; use title when text overflows. */
	let overflowTitle = $state<string | undefined>(undefined);
	let textInputEl = $state<HTMLInputElement | null>(null);

	function syncOverflowTitle(el: HTMLInputElement | null) {
		if (!el) {
			overflowTitle = undefined;
			return;
		}
		const text = (el.value ?? '').trim();
		overflowTitle =
			text && el.scrollWidth > el.clientWidth + 1 ? text : undefined;
	}

	/** One-way `value={…}` from parents must still update the DOM. */
	function handleInput(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		value = el.value;
		syncOverflowTitle(el);
		oninput?.(e);
	}

	function emitSyntheticInput(next: string) {
		value = next;
		if (oninput) {
			oninput({
				currentTarget: { value: next },
				target: { value: next }
			} as unknown as Event);
		}
	}

	/** Match native `datetime-local` (`YYYY-MM-DDTHH:mm`, no seconds). */
	function onDateTimeChange(next: string) {
		const stripped = next.replace(
			/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}$/,
			'$1'
		);
		emitSyntheticInput(stripped);
	}

	/** Native `<input type="time">` parity: always `HH:mm` (no seconds). */
	function onTimeChange(next: string) {
		const normalized = normalizeTime(next) ?? '09:00:00';
		emitSyntheticInput(normalized.slice(0, 5));
	}

	const timePickerValue = $derived(
		normalizeTime(value) ?? (value ? String(value) : '')
	);

	const pickerSize = $derived(
		typeof className === 'string' && /\binput-sm\b/.test(className)
			? 'sm'
			: 'md'
	);

	$effect(() => {
		if (isWashPicker) return;
		void value;
		void className;
		const el = textInputEl;
		if (!el) return;
		const next = value ?? '';
		if (el.value !== next) el.value = next;
		queueMicrotask(() => syncOverflowTitle(el));
	});

	$effect(() => {
		if (isWashPicker) return;
		const el = textInputEl;
		if (!el || typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => syncOverflowTitle(el));
		ro.observe(el);
		return () => ro.disconnect();
	});
</script>

{#if isDateField || isDateTimeField}
	<WashDatePicker
		{id}
		value={value ?? ''}
		includeTime={isDateTimeField}
		{min}
		{max}
		{disabled}
		{required}
		name={nameText}
		size={pickerSize}
		className={className ?? ''}
		placeholder={inputPlaceholderText}
		aria-label={ariaLabel}
		onChange={isDateTimeField ? onDateTimeChange : emitSyntheticInput}
	/>
{:else if isTimeField}
	<WashTimePicker
		{id}
		value={timePickerValue || undefined}
		onChange={onTimeChange}
		{disabled}
		size={pickerSize}
		className={className ?? ''}
		aria-label={ariaLabel}
	/>
	{#if nameText}
		<input
			type="hidden"
			name={nameText}
			value={value ?? ''}
			{required}
			{disabled}
		/>
	{/if}
{:else if rawStyle}
	<input
		bind:this={textInputEl}
		{id}
		class={className}
		type={inputType}
		placeholder={inputPlaceholderText}
		pattern={inputPattern}
		minlength={minLength ?? 1}
		maxlength={maxlength ?? 50}
		{min}
		{max}
		{step}
		title={overflowTitle ?? inputTitle}
		name={nameText}
		value={value ?? ''}
		aria-label={ariaLabel}
		onclick={onClick}
		oninput={handleInput}
		{required}
		{checked}
		{hidden}
		{disabled}
	/>
{:else}
	<input
		bind:this={textInputEl}
		{id}
		class="input {className}"
		type={inputType}
		placeholder={inputPlaceholderText}
		pattern={inputPattern}
		minlength={minLength ?? 1}
		maxlength={maxlength ?? 50}
		{min}
		{max}
		{step}
		title={overflowTitle ?? inputTitle}
		name={nameText}
		value={value ?? ''}
		aria-label={ariaLabel}
		{required}
		{checked}
		{hidden}
		{disabled}
		onclick={onClick}
		oninput={handleInput}
	/>
{/if}
