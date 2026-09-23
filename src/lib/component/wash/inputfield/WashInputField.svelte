<script lang="ts">
	/**
	 * Date fields use the native `<input type="date">` (same as Design Wash Input).
	 * Do not wrap dates in a popover calendar here — overflow-marquee / top-layer
	 * popovers were blocking clicks on the picker chrome. Use `WashCalendar` only
	 * where a full calendar widget is intentional (e.g. appointment profile bar).
	 */
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

{#if rawStyle}
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
