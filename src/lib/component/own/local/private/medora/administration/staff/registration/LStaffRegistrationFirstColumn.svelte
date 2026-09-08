<script lang="ts">
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type {
		PatientRegGenderRow,
		PatientRegMaritalStatusRow,
		PatientRegTitleRow
	} from '$lib/model/type/medora/staff-reg-ui.type';

	let {
		titleData,
		genderData,
		maritalStatusData,
		selectedStaffCode = $bindable(),
		selectedTitleId = $bindable(),
		selectedFirstName = $bindable(),
		selectedMiddleName = $bindable(),
		selectedLastName = $bindable(),
		selectedEmail = $bindable(),
		selectedGenderId = $bindable(),
		selectedMaritalStatusId = $bindable(),
		emailDisabled = false
	} = $props<{
		titleData: PatientRegTitleRow[];
		genderData: PatientRegGenderRow[];
		maritalStatusData: PatientRegMaritalStatusRow[];
		selectedStaffCode?: string;
		selectedTitleId?: string;
		selectedFirstName?: string;
		selectedMiddleName?: string;
		selectedLastName?: string;
		selectedEmail?: string;
		selectedGenderId?: string;
		selectedMaritalStatusId?: string;
		/** When true, email is read-only (e.g. when editing existing staff). */
		emailDisabled?: boolean;
	}>();
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="staff-code" class="shrink-0 sm:w-36">Staff Code</label>
		<div class="max-w-80 flex-1">
			<WashInputField
				bind:value={selectedStaffCode}
				inputType="text"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="title" class="shrink-0 sm:w-36">Title</label>
		<div class="max-w-80 flex-1">
			<WashSelect
				bind:value={selectedTitleId}
				optionHeader="Select a title ..."
			>
				{#each titleData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</WashSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="first-name" class="shrink-0 sm:w-36">First Name <span class="text-error">*</span></label>
		<div class="max-w-80 flex-1">
			<WashInputField
				bind:value={selectedFirstName}
				inputType="text"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="middle-name" class="shrink-0 sm:w-36">Middle Name</label>
		<div class="max-w-80 flex-1">
			<WashInputField
				bind:value={selectedMiddleName}
				inputType="text"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="last-name" class="shrink-0 sm:w-36">Last Name</label>
		<div class="max-w-80 flex-1">
			<WashInputField
				bind:value={selectedLastName}
				inputType="text"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<label for="email" class="shrink-0 sm:w-36">Email</label>
		<div class="max-w-80 flex-1">
			<WashInputField
				bind:value={selectedEmail}
				inputType="email"
				className="validator"
				inputPlaceholderText="mail@site.com"
				disabled={emailDisabled}
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
