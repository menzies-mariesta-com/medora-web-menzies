<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import type {
		BloodTypeSchema,
		CitySchema,
		CountrySchema,
		NationalitySchema,
		PostalCodeSchema,
		ReligionSchema,
		StateSchema
	} from '$lib/server/db/schema-type';

	let {
		countryData,
		bloodTypeData,
		stateData,
		cityData,
		postalCodeData,
		nationalityData,
		religionData,
		filteredStateData,
		filteredCityData,
		filteredPostalCodeData,
		selectedCountry,
		selectedState,
		selectedCity,
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
		countryData: CountrySchema[];
		bloodTypeData: BloodTypeSchema[];
		stateData: StateSchema[];
		cityData: CitySchema[];
		postalCodeData: PostalCodeSchema[];
		nationalityData: NationalitySchema[];
		religionData: ReligionSchema[];
		filteredStateData: StateSchema[];
		filteredCityData: CitySchema[];
		filteredPostalCodeData: PostalCodeSchema[];
		selectedCountry: CountrySchema;
		selectedState: StateSchema;
		selectedCity: CitySchema;
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
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="blood-type" className="shrink-0 sm:w-36"
			>Blood Type</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedBloodTypeId}
				optionHeader="Select a blood type ..."
			>
				{#each bloodTypeData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="country" className="shrink-0 sm:w-36"
			>Country</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedCountryId}
				optionHeader="Select a country ..."
			>
				{#each countryData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="state" className="shrink-0 sm:w-36"
			>State</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedStateId}
				optionHeader="Select a state ..."
				disabled={!selectedCountry?.id}
			>
				{#each filteredStateData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="city" className="shrink-0 sm:w-36"
			>City</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedCityId}
				optionHeader="Select a city ..."
				disabled={!selectedState?.id}
			>
				{#each filteredCityData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="postal-code" className="shrink-0 sm:w-36"
			>Postal Code</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedPostalCodeId}
				optionHeader="Select a postal code ..."
				disabled={!selectedCity?.id}
			>
				{#each filteredPostalCodeData as data (data.id)}
					<option value={String(data.id)}>{String(data.value)}</option
					>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="nationality" className="shrink-0 sm:w-36"
			>Nationality</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedNationalityId}
				optionHeader="Select a nationality ..."
			>
				{#each nationalityData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="religion" className="shrink-0 sm:w-36"
			>Religion</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedReligionId}
				optionHeader="Select a religion ..."
			>
				{#each religionData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	{#if showCheckDuplicate && onCheckDuplicate}
		<div class="justify-entered flex">
			<DaisyUiButton
				type="button"
				className="d-btn-outline d-btn"
				disabled={duplicateCheckLoading}
				onClick={onCheckDuplicate}
			>
				{duplicateCheckLoading ? 'Checking...' : 'Check Duplicate'}
			</DaisyUiButton>
		</div>
	{/if}
</div>
