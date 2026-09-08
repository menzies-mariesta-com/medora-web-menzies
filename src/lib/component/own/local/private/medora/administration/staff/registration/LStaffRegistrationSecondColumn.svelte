<script lang="ts">
	import MenziesPhoneField from '$lib/component/own/library/menzies/phone/MenziesPhoneField.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type {
		PatientRegBloodTypeRow,
		PatientRegCountryRow,
		StaffRegStaffEmploymentTypeRow,
		StaffRegStaffTypeRow
	} from '$lib/model/type/medora/staff-reg-ui.type';
	import { m } from '$lib/paraglide/messages';

	let {
		countryData,
		bloodTypeData,
		staffTypeData,
		staffEmploymentTypeData,
		selectedPhoneCountryId = $bindable(),
		selectedPhone = $bindable(),
		selectedPhoneSecondaryCountryId = $bindable(),
		selectedPhoneSecondary = $bindable(),
		selectedDateOfBirth = $bindable(),
		selectedStaffTypeId = $bindable(),
		selectedStaffEmploymentTypeId = $bindable(),
		selectedEducation = $bindable(),
		selectedDesignation = $bindable(),
		selectedBloodTypeId = $bindable()
	} = $props<{
		countryData: PatientRegCountryRow[];
		bloodTypeData: PatientRegBloodTypeRow[];
		staffTypeData: StaffRegStaffTypeRow[];
		staffEmploymentTypeData: StaffRegStaffEmploymentTypeRow[];
		selectedPhoneCountryId?: string;
		selectedPhone?: string;
		selectedPhoneSecondaryCountryId?: string;
		selectedPhoneSecondary?: string;
		selectedDateOfBirth?: string;
		selectedStaffTypeId?: string;
		selectedStaffEmploymentTypeId?: string;
		selectedEducation?: string;
		selectedDesignation?: string;
		selectedBloodTypeId?: string;
	}>();
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="phone" class="shrink-0 sm:w-36">Phone</label>
		<div class="max-w-80 flex-1">
			<MenziesPhoneField
				id="phone"
				bind:countryId={selectedPhoneCountryId}
				bind:phone={selectedPhone}
				countries={countryData}
				optionHeader={m.select_country_code()}
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="phone-secondary" class="shrink-0 sm:w-36">Phone (Secondary)</label>
		<div class="max-w-80 flex-1">
			<MenziesPhoneField
				id="phone-secondary"
				bind:countryId={selectedPhoneSecondaryCountryId}
				bind:phone={selectedPhoneSecondary}
				countries={countryData}
				optionHeader={m.select_country_code()}
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="date-of-birth" class="shrink-0 sm:w-36">Date of Birth</label>
		<div class="max-w-80 flex-1">
			<WashInputField
				bind:value={selectedDateOfBirth}
				inputType="date"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="staff-type" class="shrink-0 sm:w-36">Staff Type</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedStaffTypeId}
				optionHeader="Select a staff type ..."
			>
				{#each staffTypeData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="employment-type" class="shrink-0 sm:w-36">Employment Type <span class="text-error">*</span></label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedStaffEmploymentTypeId}
				optionHeader="Select a employment type ..."
			>
				{#each staffEmploymentTypeData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="education" class="shrink-0 sm:w-36">Education</label>
		<div class="max-w-80 flex-1">
			<WashInputField
				bind:value={selectedEducation}
				inputType="text"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="designation" class="shrink-0 sm:w-36">Designation</label>
		<div class="max-w-80 flex-1">
			<WashInputField
				bind:value={selectedDesignation}
				inputType="text"
			/>
		</div>
	</div>
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
</div>
