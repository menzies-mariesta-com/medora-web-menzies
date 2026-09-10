<script lang="ts">
	/**
	 * Compatibility shim — prefer `SearchSelect` for new code.
	 */
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import type { SearchSelectOption } from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';

	let {
		options = [],
		placeholder = 'Search...',
		value = $bindable(''),
		onChange,
		className,
		disabled,
		inputId,
		searchFn,
		getLabelForValue,
		debounceMs = 300,
		minSearchLength = 0,
		invalidateKey,
		placement = 'down'
	}: {
		options?: SearchSelectOption[];
		placeholder?: string;
		value?: string;
		onChange?: (value: string) => void;
		className?: string;
		disabled?: boolean;
		inputId?: string;
		searchFn?: (query: string) => Promise<SearchSelectOption[]>;
		getLabelForValue?: (value: string) => Promise<string>;
		debounceMs?: number;
		minSearchLength?: number;
		invalidateKey?: unknown;
		placement?: 'down' | 'up';
	} = $props();
</script>

<SearchSelect
	bind:value
	{options}
	{placeholder}
	{onChange}
	{className}
	{disabled}
	{inputId}
	{searchFn}
	{getLabelForValue}
	{debounceMs}
	{minSearchLength}
	{invalidateKey}
	{placement}
/>
