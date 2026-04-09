<script lang="ts">
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiJoinItem from '$lib/component/daisyui/join/item/DaisyUiJoinItem.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import type {
		PatientRegBloodTypeRow,
		PatientRegCountryRow,
		StaffRegStaffEmploymentTypeRow,
		StaffRegStaffTypeRow
	} from '$lib/model/type/heka/staff-reg-ui.type';

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
		<DaisyUiLabel forText="phone" className="shrink-0 sm:w-36"
			>Phone</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiJoin>
				<DaisyUiSelect
					bind:value={selectedPhoneCountryId}
					optionHeader="Select country code ..."
					className="min-w-20 d-join-item"
				>
					{#each countryData as data (data.id)}
						<option value={String(data.id)} class="gap-5"
							>{data.countryCallingCode} [{data.code.toUpperCase()}]</option
						>
					{/each}
				</DaisyUiSelect>
				<DaisyUiInputField
					bind:value={selectedPhone}
					inputType="tel"
					className="d-join-item"
				/>
			</DaisyUiJoin>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel
			forText="phone-secondary"
			className="shrink-0 sm:w-36">Phone (Secondary)</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiJoin>
				<DaisyUiSelect
					bind:value={selectedPhoneSecondaryCountryId}
					optionHeader="Select country code ..."
					className="min-w-20 d-join-item"
				>
					{#each countryData as data (data.id)}
						<option value={String(data.id)} class="gap-5"
							>{data.countryCallingCode} [{data.code.toUpperCase()}]</option
						>
					{/each}
				</DaisyUiSelect>
				<DaisyUiInputField
					bind:value={selectedPhoneSecondary}
					inputType="tel"
					className="d-join-item"
				/>
			</DaisyUiJoin>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="date-of-birth" className="shrink-0 sm:w-36"
			>Date of Birth</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField
				bind:value={selectedDateOfBirth}
				inputType="date"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="staff-type" className="shrink-0 sm:w-36"
			>Staff Type</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedStaffTypeId}
				optionHeader="Select a staff type ..."
			>
				{#each staffTypeData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel
			forText="employment-type"
			className="shrink-0 sm:w-36"
			>Employment Type <span class="text-error">*</span></DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedStaffEmploymentTypeId}
				optionHeader="Select a employment type ..."
			>
				{#each staffEmploymentTypeData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="education" className="shrink-0 sm:w-36"
			>Education</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField
				bind:value={selectedEducation}
				inputType="text"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="designation" className="shrink-0 sm:w-36"
			>Designation</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField
				bind:value={selectedDesignation}
				inputType="text"
			/>
		</div>
	</div>
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
</div>
