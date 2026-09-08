<script lang="ts">
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { SpecializationWithRelations } from '$lib/model/type/specialization-with-relations.type';
	import type {
		PatientRegCityRow,
		PatientRegCountryRow,
		PatientRegIdentityTypeRow,
		PatientRegNationalityRow,
		PatientRegPostalCodeRow,
		PatientRegStateRow,
		StaffRegDepartmentRow
	} from '$lib/model/type/medora/staff-reg-ui.type';

	let {
		countryData,
		stateData,
		cityData,
		postalCodeData,
		nationalityData,
		departmentData,
		specializationData,
		identityTypeData,
		filteredStateData,
		filteredCityData,
		filteredPostalCodeData,
		selectedCountry,
		selectedState,
		selectedCity,
		selectedCountryId = $bindable(),
		selectedStateId = $bindable(),
		selectedCityId = $bindable(),
		selectedPostalCodeId = $bindable(),
		selectedDepartmentId = $bindable(),
		selectedSpecializationId = $bindable(),
		selectedIdentityTypeId = $bindable(),
		selectedIdentityNumber = $bindable(),
		selectedNationalityId = $bindable()
	} = $props<{
		countryData: PatientRegCountryRow[];
		stateData: PatientRegStateRow[];
		cityData: PatientRegCityRow[];
		nationalityData: PatientRegNationalityRow[];
		postalCodeData: PatientRegPostalCodeRow[];
		departmentData: StaffRegDepartmentRow[];
		specializationData: SpecializationWithRelations[];
		identityTypeData: PatientRegIdentityTypeRow[];
		filteredStateData: PatientRegStateRow[];
		filteredCityData: PatientRegCityRow[];
		filteredPostalCodeData: PatientRegPostalCodeRow[];
		selectedCountry: PatientRegCountryRow;
		selectedState: PatientRegStateRow;
		selectedCity: PatientRegCityRow;
		selectedCountryId?: string;
		selectedStateId?: string;
		selectedCityId?: string;
		selectedPostalCodeId?: string;
		selectedDepartmentId?: string;
		selectedSpecializationId?: string;
		selectedIdentityTypeId?: string;
		selectedIdentityNumber?: string;
		selectedNationalityId?: string;
	}>();
</script>

<div class="flex flex-col gap-4">
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
		<label for="department" class="shrink-0 sm:w-36">Department</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedDepartmentId}
				optionHeader="Select a department ..."
			>
				{#each departmentData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="specialization" class="shrink-0 sm:w-36">Specialization</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedSpecializationId}
				optionHeader="Select a specialization ..."
			>
				{#each specializationData as data (data.id)}
					<option value={String(data.id)}
						>{data.name} ({data.craftGroup.name})</option
					>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="identity-type" class="shrink-0 sm:w-36">Identity</label>
		<div class="max-w-80 flex-1">
			<div class="join flex">
				<WashSelect
					bind:value={selectedIdentityTypeId}
					optionHeader="Select an identity type ..."
					className="join-item"
				>
					{#each identityTypeData as data (data.id)}
						<option value={String(data.id)}>{data.name}</option>
					{/each}
				</WashSelect>
				<WashInputField
					bind:value={selectedIdentityNumber}
					inputType="text"
					className="join-item"
				/>
			</div>
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
</div>
