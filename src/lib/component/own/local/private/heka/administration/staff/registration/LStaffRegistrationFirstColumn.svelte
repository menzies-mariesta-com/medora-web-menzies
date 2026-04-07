<script lang="ts">
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import type {
		PatientRegGenderRow,
		PatientRegMaritalStatusRow,
		PatientRegTitleRow
	} from '$lib/model/type/heka/staff-reg-ui.type';

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
		<DaisyUiLabel forText="staff-code" className="shrink-0 sm:w-36"
			>Staff Code</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField
				bind:value={selectedStaffCode}
				inputType="text"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="title" className="shrink-0 sm:w-36"
			>Title</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedTitleId}
				optionHeader="Select a title ..."
			>
				{#each titleData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="first-name" className="shrink-0 sm:w-36"
			>First Name <span class="text-error">*</span></DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField
				bind:value={selectedFirstName}
				inputType="text"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="middle-name" className="shrink-0 sm:w-36"
			>Middle Name</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField
				bind:value={selectedMiddleName}
				inputType="text"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="last-name" className="shrink-0 sm:w-36"
			>Last Name</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField
				bind:value={selectedLastName}
				inputType="text"
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="email" className="shrink-0 sm:w-36"
			>Email</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField
				bind:value={selectedEmail}
				inputType="email"
				className="d-validator"
				inputPlaceholderText="mail@site.com"
				disabled={emailDisabled}
			/>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="gender" className="shrink-0 sm:w-36"
			>Gender</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedGenderId}
				optionHeader="Select a gender ..."
			>
				{#each genderData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel
			forText="marital-status"
			className="shrink-0 sm:w-36">Marital Status</DaisyUiLabel
		>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect
				bind:value={selectedMaritalStatusId}
				optionHeader="Select a marital status ..."
			>
				{#each maritalStatusData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
</div>
