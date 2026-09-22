<script lang="ts">
	import WashCalendar from '$lib/component/wash/calendar/WashCalendar.svelte';

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

	const isDateType = $derived(inputType === 'date');

	const popoverId = $derived(
		isDateType
			? `wash-cal-popover-${id ?? crypto.randomUUID().slice(0, 8)}`
			: ''
	);
	const anchorName = $derived(
		isDateType ? `--wash-cal-anchor-${id ?? popoverId}` : ''
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

	function handleCalendarChange(next: string) {
		value = next;
		const popover = document.getElementById(
			popoverId
		) as HTMLDivElement | null;
		popover?.hidePopover?.();
	}

	/** One-way `value={…}` from parents (e.g. navbar locator) must still update the DOM.
	 *  Native `bind:value` can stick on the first empty paint with `$bindable`. */
	function handleInput(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		value = el.value;
		syncOverflowTitle(el);
		oninput?.(e);
	}

	$effect(() => {
		void value;
		void className;
		const el = textInputEl;
		if (!el) return;
		queueMicrotask(() => syncOverflowTitle(el));
	});

	$effect(() => {
		const el = textInputEl;
		if (!el || typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => syncOverflowTitle(el));
		ro.observe(el);
		return () => ro.disconnect();
	});
</script>

{#if isDateType}
	<button
		{id}
		type="button"
		popovertarget={popoverId}
		class="input-bordered input min-w-0 truncate text-left {className}"
		style="anchor-name:{anchorName}"
		{disabled}
		{hidden}
	>
		{value || inputPlaceholderText || 'Pick a date'}
	</button>
	<div
		id={popoverId}
		popover
		class="dropdown rounded-box bg-base-100 p-3 shadow-lg"
		style="position-anchor:{anchorName}"
	>
		<WashCalendar
			mode="single"
			bind:value
			{min}
			{max}
			size="sm"
			bordered={false}
			showOutsideDays
			aria-label="Pick a date"
			onChange={handleCalendarChange}
		/>
	</div>
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
