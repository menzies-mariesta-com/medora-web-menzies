<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
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
		countryData: PatientRegCountryRow[];
		bloodTypeData: PatientRegBloodTypeRow[];
		stateData: PatientRegStateRow[];
		cityData: PatientRegCityRow[];
		postalCodeData: PatientRegPostalCodeRow[];
		nationalityData: PatientRegNationalityRow[];
		religionData: PatientRegReligionRow[];
		filteredStateData: PatientRegStateRow[];
		filteredCityData: PatientRegCityRow[];
		filteredPostalCodeData: PatientRegPostalCodeRow[];
		selectedCountry: PatientRegCountryRow;
		selectedState: PatientRegStateRow;
		selectedCity: PatientRegCityRow;
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
			<WashSelect
				bind:value={selectedCountryId}
				optionHeader="Select a country ..."
			>
				{#each countryData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="state" class="shrink-0 sm:w-36">State</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedStateId}
				optionHeader="Select a state ..."
				disabled={!selectedCountry?.id}
			>
				{#each filteredStateData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="city" class="shrink-0 sm:w-36">City</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedCityId}
				optionHeader="Select a city ..."
				disabled={!selectedState?.id}
			>
				{#each filteredCityData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="postal-code" class="shrink-0 sm:w-36">Postal Code</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedPostalCodeId}
				optionHeader="Select a postal code ..."
				disabled={!selectedCity?.id}
			>
				{#each filteredPostalCodeData as data (data.id)}
					<option value={String(data.id)}>{String(data.value)}</option
					>
				{/each}
			</WashSelect>
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
