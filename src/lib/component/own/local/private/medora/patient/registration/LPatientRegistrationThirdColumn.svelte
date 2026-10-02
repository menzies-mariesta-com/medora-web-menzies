<script lang="ts">
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type {
		PatientRegBloodTypeRow,
		PatientRegCityRow,
		PatientRegCountryRow,
		PatientRegNationalityRow,
		PatientRegPostalCodeRow,
		PatientRegReligionRow,
		PatientRegStateRow
	} from '$lib/model/type/medora/patient-reg-master.type';
	import { m } from '$lib/paraglide/messages';

	let {
		countryData,
		bloodTypeData,
		nationalityData,
		religionData,
		filteredStateData,
		filteredCityData,
		filteredPostalCodeData,
		selectedCountry,
		selectedState,
		selectedCountryId = $bindable(),
		selectedBloodTypeId = $bindable(),
		selectedStateId = $bindable(),
		selectedCityId = $bindable(),
		selectedPostalCodeId = $bindable(),
		selectedNationalityId = $bindable(),
		selectedReligionId = $bindable(),
		duplicateCheckLoading = false,
		showCheckDuplicate = false,
		onCheckDuplicate
	} = $props<{
		countryData: PatientRegCountryRow[];
		bloodTypeData: PatientRegBloodTypeRow[];
		nationalityData: PatientRegNationalityRow[];
		religionData: PatientRegReligionRow[];
		filteredStateData: PatientRegStateRow[];
		filteredCityData: PatientRegCityRow[];
		filteredPostalCodeData: PatientRegPostalCodeRow[];
		selectedCountry: PatientRegCountryRow;
		selectedState: PatientRegStateRow;
		selectedCountryId?: string;
		selectedBloodTypeId?: string;
		selectedStateId?: string;
		selectedCityId?: string;
		selectedPostalCodeId?: string;
		selectedNationalityId?: string;
		selectedReligionId?: string;
		duplicateCheckLoading?: boolean;
		showCheckDuplicate?: boolean;
		onCheckDuplicate?: () => void;
	}>();

	const msg = m as Record<string, (inputs?: object) => string>;

	const countryOptions = $derived(
		countryData.map((d) => ({
			value: String(d.id),
			label: d.name ?? String(d.id)
		}))
	);
	const stateOptions = $derived(
		filteredStateData.map((d) => ({
			value: String(d.id),
			label: d.name ?? String(d.id)
		}))
	);
	const cityOptions = $derived(
		filteredCityData.map((d) => ({
			value: String(d.id),
			label: d.name ?? String(d.id)
		}))
	);
	const postalCodeDisplay = $derived.by(() => {
		const row = filteredPostalCodeData.find(
			(d) => String(d.id) === selectedPostalCodeId
		);
		return row?.value != null ? String(row.value) : '';
	});
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="blood-type" class="shrink-0 sm:w-36">Blood Type</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedBloodTypeId}
				optionHeader="Select a blood type ..."
			>
				{#each bloodTypeData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="country" class="shrink-0 sm:w-36">Country</label>
		<div class="max-w-80 flex-1">
			<SearchSelect
				inputId="country"
				bind:value={selectedCountryId}
				options={countryOptions}
				placeholder="Select a country ..."
				filterPlaceholder="Search country…"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="state" class="shrink-0 sm:w-36">State</label>
		<div class="max-w-80 flex-1">
			<SearchSelect
				inputId="state"
				bind:value={selectedStateId}
				options={stateOptions}
				placeholder="Select a state ..."
				filterPlaceholder="Search state…"
				disabled={!selectedCountry?.id}
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="city" class="shrink-0 sm:w-36">{msg.city()}</label>
		<div class="max-w-80 flex-1">
			<SearchSelect
				inputId="city"
				bind:value={selectedCityId}
				options={cityOptions}
				placeholder="Select a city ..."
				filterPlaceholder="Search city…"
				disabled={!selectedState?.id}
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="postal-code" class="shrink-0 sm:w-36"
			>{msg.postal_code()}</label
		>
		<div class="max-w-80 flex-1">
			<WashInputField
				id="postal-code"
				value={postalCodeDisplay}
				inputPlaceholderText={msg.postal_code()}
				ariaLabel={msg.postal_code()}
				disabled={true}
				className="cursor-not-allowed"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="nationality" class="shrink-0 sm:w-36">Nationality</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedNationalityId}
				optionHeader="Select a nationality ..."
			>
				{#each nationalityData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="religion" class="shrink-0 sm:w-36">Religion</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedReligionId}
				optionHeader="Select a religion ..."
			>
				{#each religionData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	{#if showCheckDuplicate && onCheckDuplicate}
		<div class="justify-entered flex">
			<WashButton
				type="button"
				className="btn-outline btn"
				disabled={duplicateCheckLoading}
				onClick={onCheckDuplicate}
			>
				{duplicateCheckLoading ? 'Checking...' : 'Check Duplicate'}
			</WashButton>
		</div>
	{/if}
</div>
