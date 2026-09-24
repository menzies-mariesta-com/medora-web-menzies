<script lang="ts">
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { SpecializationWithRelations } from '$lib/model/type/specialization-with-relations.type';
	import type {
		PatientRegCityRow,
		PatientRegCountryRow,
		PatientRegIdentityTypeRow,
		PatientRegPostalCodeRow,
		PatientRegStateRow,
		StaffRegDepartmentRow
	} from '$lib/model/type/medora/staff-reg-ui.type';
	import { m } from '$lib/paraglide/messages';
	import {
		isNrcIdentityType,
		parseNrc
	} from '$lib/tool/identity/myanmar-nrc.util';
	import MenziesNrcField from '$lib/component/own/library/menzies/nrc/MenziesNrcField.svelte';

	let {
		countryData,
		stateData,
		cityData,
		postalCodeData,
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
		selectedIdentityNumber = $bindable()
	} = $props<{
		countryData: PatientRegCountryRow[];
		stateData: PatientRegStateRow[];
		cityData: PatientRegCityRow[];
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
	}>();

	const countryOptions = $derived(
		countryData.map((d: PatientRegCountryRow) => ({
			value: String(d.id),
			label: d.name ?? String(d.id)
		}))
	);
	const stateOptions = $derived(
		filteredStateData.map((d: PatientRegStateRow) => ({
			value: String(d.id),
			label: d.name ?? String(d.id)
		}))
	);
	const cityOptions = $derived(
		filteredCityData.map((d: PatientRegCityRow) => ({
			value: String(d.id),
			label: d.name ?? String(d.id)
		}))
	);
	const postalCodeOptions = $derived(
		filteredPostalCodeData.map((d: PatientRegPostalCodeRow) => ({
			value: String(d.id),
			label: String(d.value)
		}))
	);
	const specializationOptions = $derived(
		specializationData.map((d: SpecializationWithRelations) => ({
			value: String(d.id),
			label: `${d.name} (${d.craftGroup.name})`
		}))
	);
	const selectedIdentityType = $derived(
		identityTypeData.find(
			(t: PatientRegIdentityTypeRow) =>
				String(t.id) === String(selectedIdentityTypeId)
		) ?? null
	);
	const isNrcType = $derived(
		isNrcIdentityType({
			id: selectedIdentityType?.id,
			name: selectedIdentityType?.name
		})
	);
	const useStructuredNrc = $derived(
		isNrcType &&
			(!(selectedIdentityNumber ?? '').trim() ||
				parseNrc(selectedIdentityNumber) != null)
	);
</script>

<div class="flex flex-col gap-4">
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
		<label for="city" class="shrink-0 sm:w-36">City</label>
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
		<label for="postal-code" class="shrink-0 sm:w-36">Postal Code</label>
		<div class="max-w-80 flex-1">
			<SearchSelect
				inputId="postal-code"
				bind:value={selectedPostalCodeId}
				options={postalCodeOptions}
				placeholder="Select a postal code ..."
				filterPlaceholder="Search postal code…"
				disabled={!selectedCity?.id}
			/>
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
			<SearchSelect
				inputId="specialization"
				bind:value={selectedSpecializationId}
				options={specializationOptions}
				placeholder="Select a specialization ..."
				filterPlaceholder="Search specialization…"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="identity-type" class="shrink-0 sm:w-36">{m.identity()}</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				id="identity-type"
				bind:value={selectedIdentityTypeId}
				optionHeader="Select an identity type ..."
			>
				{#each identityTypeData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<!--
		Identity no spans label + control (2 columns), but right edge matches
		other fields: sm:w-36 + gap-3 + max-w-80.
	-->
	<div class="w-full min-w-0 sm:max-w-[calc(9rem+0.75rem+20rem)]">
		{#if useStructuredNrc}
			<MenziesNrcField
				bind:value={selectedIdentityNumber}
				id="staff-identity-nrc"
			/>
		{:else}
			<WashInputField
				id="staff-identity-no"
				bind:value={selectedIdentityNumber}
				inputType="text"
				className="w-full"
			/>
		{/if}
	</div>
</div>
