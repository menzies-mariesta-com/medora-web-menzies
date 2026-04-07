<script lang="ts">
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import type { SpecializationWithRelations } from '$lib/model/type/specialization-with-relations.type';
	import type {
		PatientRegCityRow,
		PatientRegCountryRow,
		PatientRegIdentityTypeRow,
		PatientRegNationalityRow,
		PatientRegPostalCodeRow,
		PatientRegStateRow,
		StaffRegDepartmentRow
	} from '$lib/model/type/heka/staff-reg-ui.type';

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
		<DaisyUiLabel forText="department" className="shrink-0 sm:w-36"
			>Department</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedDepartmentId}
				optionHeader="Select a department ..."
			>
				{#each departmentData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel
			forText="specialization"
			className="shrink-0 sm:w-36">Specialization</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedSpecializationId}
				optionHeader="Select a specialization ..."
			>
				{#each specializationData as data (data.id)}
					<option value={String(data.id)}
						>{data.name} ({data.craftGroup.name})</option
					>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="identity-type" className="shrink-0 sm:w-36"
			>Identity</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiJoin>
				<DaisyUiSelect
					bind:value={selectedIdentityTypeId}
					optionHeader="Select an identity type ..."
					className="d-join-item"
				>
					{#each identityTypeData as data (data.id)}
						<option value={String(data.id)}>{data.name}</option>
					{/each}
				</DaisyUiSelect>
				<DaisyUiInputField
					bind:value={selectedIdentityNumber}
					inputType="text"
					className="d-join-item"
				/>
			</DaisyUiJoin>
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
</div>
