<script lang="ts">
	/**
	 * Native `<select>` cannot use Design overflow marquee (skipped hosts).
	 * When the closed control’s displayed value overflows, set `title` so the
	 * full label is still discoverable on hover.
	 */
	let {
		children,
		className,
		optionHeader,
		onChange,
		value = $bindable(),
		disabled,
		id,
		name
	} = $props<{
		children?: () => void;
		onChange?: () => void;
		className?: string;
		optionHeader?: string;
		value?: any;
		disabled?: boolean;
		id?: string;
		name?: string;
	}>();

	let selectEl = $state<HTMLSelectElement | null>(null);
	let overflowTitle = $state<string | undefined>(undefined);

	function syncOverflowTitle(el: HTMLSelectElement | null) {
		if (!el) {
			overflowTitle = undefined;
			return;
		}
		const text = (el.selectedOptions[0]?.textContent ?? '')
			.replace(/\s+/g, ' ')
			.trim();
		overflowTitle =
			text && el.scrollWidth > el.clientWidth + 1 ? text : undefined;
	}

	function handleChange(e: Event) {
		syncOverflowTitle(e.currentTarget as HTMLSelectElement);
		onChange?.();
	}

	$effect(() => {
		void value;
		void className;
		const el = selectEl;
		if (!el) return;
		queueMicrotask(() => syncOverflowTitle(el));
	});

	$effect(() => {
		const el = selectEl;
		if (!el || typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => syncOverflowTitle(el));
		ro.observe(el);
		return () => ro.disconnect();
	});
</script>

<select
	bind:this={selectEl}
	class="select min-w-0 {className}"
	bind:value
	{disabled}
	{id}
	{name}
	title={overflowTitle}
	onchange={handleChange}
>
	{#if optionHeader != null && optionHeader !== ''}
		<option value="">{optionHeader}</option>
	{/if}
	{@render children?.()}
</select>
