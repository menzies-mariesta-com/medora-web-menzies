<script lang="ts">
	import MenziesPhoneField from '$lib/component/own/library/menzies/phone/MenziesPhoneField.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type {
		PatientRegCountryRow,
		PatientRegGenderRow,
		PatientRegMaritalStatusRow,
		PatientRegTitleRow
	} from '$lib/model/type/medora/patient-reg-master.type';
	import { m } from '$lib/paraglide/messages';

	let {
		titleData,
		genderData,
		maritalStatusData,
		countryData,
		patientCode = $bindable(),
		selectedTitleId = $bindable(),
		firstName = $bindable(),
		middleName = $bindable(),
		lastName = $bindable(),
		email = $bindable(),
		selectedGenderId = $bindable(),
		selectedMaritalStatusId = $bindable(),
		selectedPhoneCountryId = $bindable(),
		selectedPhone = $bindable()
	} = $props<{
		titleData: PatientRegTitleRow[];
		genderData: PatientRegGenderRow[];
		maritalStatusData: PatientRegMaritalStatusRow[];
		countryData: PatientRegCountryRow[];
		patientCode?: string;
		selectedTitleId?: string;
		firstName?: string;
		middleName?: string;
		lastName?: string;
		email?: string;
		selectedGenderId?: string;
		selectedMaritalStatusId?: string;
		selectedPhoneCountryId?: string;
		selectedPhone?: string;
	}>();
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="patient-code" class="shrink-0 sm:w-36">Patient Code</label>
		<div class="max-w-80 flex-1">
			<WashInputField
				bind:value={patientCode}
				inputType="text"
				disabled
				inputPlaceholderText="Generated on save"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="first-name" class="shrink-0 sm:w-36 font-bold"
			>First Name <span class="text-error">*</span></label
		>
		<div class="max-w-80 flex-1">
			<div class="join flex">
				<WashSelect
					id="title"
					bind:value={selectedTitleId}
					optionHeader="Title"
					className="join-item"
				>
					{#each titleData as data (data.id)}
						<option value={String(data.id)}>{data.name}</option>
					{/each}
				</WashSelect>
				<WashInputField
					id="first-name"
					bind:value={firstName}
					inputType="text"
					className="join-item"
				/>
			</div>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="middle-name" class="shrink-0 sm:w-36 font-bold"
			>Middle Name</label
		>
		<div class="max-w-80 flex-1">
			<WashInputField bind:value={middleName} inputType="text" />
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="last-name" class="shrink-0 sm:w-36 font-bold">Last Name</label
		>
		<div class="max-w-80 flex-1">
			<WashInputField bind:value={lastName} inputType="text" />
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="email" class="shrink-0 sm:w-36 font-bold">Email</label>
		<div class="max-w-80 flex-1">
			<WashInputField
				bind:value={email}
				inputType="email"
				className="validator"
				inputPlaceholderText="mail@site.com"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="phone-primary" class="shrink-0 sm:w-36 font-bold"
			>Primary Phone</label
		>
		<div class="max-w-80 flex-1">
			<MenziesPhoneField
				id="phone-primary"
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
		<label for="gender" class="shrink-0 sm:w-36">Gender</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedGenderId}
				optionHeader="Select a gender ..."
			>
				{#each genderData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="marital-status" class="shrink-0 sm:w-36">Marital Status</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedMaritalStatusId}
				optionHeader="Select a marital status ..."
			>
				{#each maritalStatusData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
</div>
