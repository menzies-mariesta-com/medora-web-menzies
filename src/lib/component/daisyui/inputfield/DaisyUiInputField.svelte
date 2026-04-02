<script lang="ts">
	import CallyDateCalendar from '$lib/component/own/library/cally/CallyDateCalendar.svelte';

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
			? `cally-popover-${id ?? crypto.randomUUID().slice(0, 8)}`
			: ''
	);
	const anchorName = $derived(
		isDateType ? `--cally-anchor-${id ?? popoverId}` : ''
	);

	function handleCallyChange(next: string) {
		value = next;
		const popover = document.getElementById(
			popoverId
		) as HTMLDivElement | null;
		popover?.hidePopover?.();
	}
</script>

{#if isDateType}
	<button
		{id}
		type="button"
		popovertarget={popoverId}
		class="d-input-bordered d-input text-left {className}"
		style="anchor-name:{anchorName}"
		{disabled}
		{hidden}
	>
		{value || inputPlaceholderText || 'Pick a date'}
	</button>
	<div
		id={popoverId}
		popover
		class="d-dropdown rounded-box bg-base-100 p-3 shadow-lg"
		style="position-anchor:{anchorName}"
	>
		<CallyDateCalendar
			bind:value
			{min}
			{max}
			showOutsideDays={true}
			className="w-full rounded-box border border-base-300 bg-base-100"
			onChange={handleCallyChange}
		/>
	</div>
{:else if rawStyle}
	<input
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
		title={inputTitle}
		name={nameText}
		bind:value
		aria-label={ariaLabel}
		onclick={onClick}
		{oninput}
		{required}
		{checked}
		{hidden}
		{disabled}
	/>
{:else}
	<input
		{id}
		class="d-input {className}"
		type={inputType}
		placeholder={inputPlaceholderText}
		pattern={inputPattern}
		minlength={minLength ?? 1}
		maxlength={maxlength ?? 50}
		{min}
		{max}
		{step}
		title={inputTitle}
		name={nameText}
		bind:value
		aria-label={ariaLabel}
		{required}
		{checked}
		{hidden}
		{disabled}
		onclick={onClick}
		{oninput}
	/>
{/if}
