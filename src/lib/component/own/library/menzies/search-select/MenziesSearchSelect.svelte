<script lang="ts">
	/**
	 * @deprecated Prefer `SearchSelect` (gallery name). Forwards to the same component.
	 */
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import type { SearchSelectOption } from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';

	export type MenziesSearchSelectOption = SearchSelectOption;

	let {
		options = [],
		placeholder = 'Choose…',
		value = $bindable(''),
		onChange,
		className = '',
		triggerClassName = '',
		inputClassName = '',
		disabled = false,
		inputId,
		label,
		required = false,
		emptyMessage = 'No options match.',
		searchFn,
		getLabelForValue,
		debounceMs = 300,
		minSearchLength = 0,
		invalidateKey,
		placement = 'down',
		filterPlaceholder = 'Type to filter…'
	}: {
		options?: SearchSelectOption[];
		placeholder?: string;
		value?: string;
		onChange?: (value: string) => void;
		className?: string;
		triggerClassName?: string;
		inputClassName?: string;
		disabled?: boolean;
		inputId?: string;
		label?: string;
		required?: boolean;
		emptyMessage?: string;
		searchFn?: (query: string) => Promise<SearchSelectOption[]>;
		getLabelForValue?: (value: string) => Promise<string>;
		debounceMs?: number;
		minSearchLength?: number;
		invalidateKey?: unknown;
		placement?: 'down' | 'up';
		filterPlaceholder?: string;
	} = $props();
</script>

<SearchSelect
	bind:value
	{options}
	{placeholder}
	{onChange}
	{className}
	{triggerClassName}
	{inputClassName}
	{disabled}
	{inputId}
	{label}
	{required}
	{emptyMessage}
	{searchFn}
	{getLabelForValue}
	{debounceMs}
	{minSearchLength}
	{invalidateKey}
	{placement}
	{filterPlaceholder}
/>
