<script lang="ts">
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

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
		optionHeader?: string;
		nameText?: string;
		placeholder?: string;
		className?: string;
		selectClassName?: string;
		inputClassName?: string;
	} = $props();

	const selectId = $derived(id ? `${id}-country` : undefined);
	const inputId = $derived(id);
</script>

{#if label}
	<label for={inputId} class="label">
		<span class="label-text">{label}</span>
	</label>
{/if}
<div class="{washRecipes.join} flex w-full {className}">
	<WashSelect
		id={selectId}
		bind:value={countryId}
		{optionHeader}
		{disabled}
		className="join-item w-1/2 min-w-0 {selectClassName}"
	>
		{#each countries as data (data.id)}
			<option value={String(data.id)} class="gap-5">
				{data.countryCallingCode ?? ''} [{String(data.code ?? data.id).toUpperCase()}]
			</option>
		{/each}
	</WashSelect>
	<WashInputField
		id={inputId}
		bind:value={phone}
		inputType="tel"
		{disabled}
		{required}
		{nameText}
		inputPlaceholderText={placeholder}
		className="join-item w-1/2 min-w-0 {inputClassName}"
	/>
</div>
