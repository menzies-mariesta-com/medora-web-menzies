<script lang="ts">
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import type {
		GenderSchema,
		HospitalSchema,
		MaritalStatusSchema,
		TitleSchema
	} from '$lib/server/db/schema-type';

	let {
		titleData,
		genderData,
		maritalStatusData,
		hospitalData = [],
		patientCode = $bindable(),
		selectedHospitalId = $bindable(),
		selectedTitleId = $bindable(),
		firstName = $bindable(),
		middleName = $bindable(),
		lastName = $bindable(),
		email = $bindable(),
		selectedGenderId = $bindable(),
		selectedMaritalStatusId = $bindable(),
		showHospitalSelect = false
	} = $props<{
		titleData: TitleSchema[];
		genderData: GenderSchema[];
		maritalStatusData: MaritalStatusSchema[];
		hospitalData?: HospitalSchema[];
		patientCode?: string;
		selectedHospitalId?: string;
		selectedTitleId?: string;
		firstName?: string;
		middleName?: string;
		lastName?: string;
		email?: string;
		selectedGenderId?: string;
		selectedMaritalStatusId?: string;
		/** When true (new patient), show hospital dropdown; code is generated on backend on save */
		showHospitalSelect?: boolean;
	}>();
</script>

<div class="flex flex-col gap-4">
	{#if showHospitalSelect && hospitalData.length > 0}
		<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="hospital" className="shrink-0 sm:w-36">Hospital</DaisyUiLabel>
			<div class="max-w-80 flex-1">
				<DaisyUiSelect bind:value={selectedHospitalId} optionHeader="Select hospital ...">
					{#each hospitalData as data (data.id)}
						<option value={String(data.id)}>{data.name} ({data.code ?? data.id})</option>
					{/each}
				</DaisyUiSelect>
			</div>
		</div>
	{/if}
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="patient-code" className="shrink-0 sm:w-36">Patient Code</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField
				bind:value={patientCode}
				inputType="text"
				disabled
				inputPlaceholderText={showHospitalSelect ? 'Generated on save' : undefined}
			/>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="title" className="shrink-0 sm:w-36">Title</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect bind:value={selectedTitleId} optionHeader="Select a title ...">
				{#each titleData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="first-name" className="shrink-0 sm:w-36 font-bold">First Name <span class="text-error">*</span></DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField bind:value={firstName} inputType="text" />
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="middle-name" className="shrink-0 sm:w-36 font-bold">Middle Name</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField bind:value={middleName} inputType="text" />
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="last-name" className="shrink-0 sm:w-36 font-bold">Last Name</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField bind:value={lastName} inputType="text" />
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="email" className="shrink-0 sm:w-36 font-bold">Email</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiInputField
				bind:value={email}
				inputType="email"
				className="d-validator"
				inputPlaceholderText="mail@site.com"
			/>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="gender" className="shrink-0 sm:w-36">Gender</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect bind:value={selectedGenderId} optionHeader="Select a gender ...">
				{#each genderData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="marital-status" className="shrink-0 sm:w-36">Marital Status</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect bind:value={selectedMaritalStatusId} optionHeader="Select a marital status ...">
				{#each maritalStatusData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
</div>
