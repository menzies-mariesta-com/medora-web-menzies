<script lang="ts">
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';

	export type MenziesPhoneCountryOption = {
		id: number | string;
		code?: string | null;
		countryCallingCode: string | null | undefined;
		name?: string | null;
	};

	let {
		countryId = $bindable(''),
		phone = $bindable(''),
		countries = [],
		id,
		label,
		disabled = false,
		required = false,
		optionHeader = '',
		nameText,
		placeholder,
		className = '',
		selectClassName = '',
		inputClassName = ''
	}: {
		countryId?: string;
		phone?: string;
		countries?: MenziesPhoneCountryOption[];
		id?: string;
		label?: string;
		disabled?: boolean;
		required?: boolean;
		/** Placeholder when no country code is selected. */
		optionHeader?: string;
		nameText?: string;
		placeholder?: string;
		className?: string;
		selectClassName?: string;
		inputClassName?: string;
	} = $props();

	const selectId = $derived(id ? `${id}-country` : undefined);
	const inputId = $derived(id);

	const countryOptions = $derived(
		countries.map((data) => {
			const code = String(data.code ?? data.id).toUpperCase();
			const dial = data.countryCallingCode ?? '';
			return {
				value: String(data.id),
				label: `${dial} [${code}]`
			};
		})
	);
</script>

{#if label}
	<label for={inputId} class="label">
		<span class="label-text">{label}</span>
	</label>
{/if}
<!--
	Manual join (not Daisy `.join`): SearchSelect’s root wrappers break
	`.join > .join-item`, so we merge borders here and use joinItem so the
	trigger is the visible control.
-->
<div
	class="flex w-full min-w-0 overflow-hidden rounded-[var(--radius-field)] border border-ink-border {className}"
>
	<SearchSelect
		joinItem
		inputId={selectId}
		bind:value={countryId}
		options={countryOptions}
		placeholder={optionHeader || 'Code…'}
		filterPlaceholder="Search code…"
		{disabled}
		className="w-1/2 min-w-0 rounded-none border-0 border-r border-ink-border shadow-none {selectClassName}"
	/>
	<WashInputField
		id={inputId}
		bind:value={phone}
		inputType="tel"
		{disabled}
		{required}
		{nameText}
		inputPlaceholderText={placeholder}
		className="w-1/2 min-w-0 rounded-none border-0 shadow-none {inputClassName}"
	/>
</div>
