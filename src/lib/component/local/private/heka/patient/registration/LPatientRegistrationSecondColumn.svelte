<script lang="ts">
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/library/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import type {
		BloodTypeSchema,
		CountrySchema,
		IdentityTypeSchema,

		TitleSchema

	} from '$lib/server/db/schema-type';

	let {
		titleData,
		countryData,
		identityTypeData,
		bloodTypeData,
		selectedPhoneCountryId = $bindable(),
		selectedPhone = $bindable(),
		selectedPhoneSecondaryCountryId = $bindable(),
		selectedPhoneSecondary = $bindable(),
		selectedFatherTitleId = $bindable(),
		selectedGuardianTitleId = $bindable(),
		selectedGuardianPhoneCountryId = $bindable(),
		selectedIdentityTypeId = $bindable(),
		identityNo = $bindable(),
		dateOfBirth = $bindable(),
		dateOfBirthMax,
		fatherName = $bindable(),
		guardianName = $bindable(),
		guardianPhone = $bindable(),
		selectedBloodTypeId = $bindable()
	} = $props<{
		titleData: TitleSchema[];
		countryData: CountrySchema[];
		identityTypeData: IdentityTypeSchema[];
		bloodTypeData: BloodTypeSchema[];
		selectedPhoneCountryId?: string;
		selectedPhone?: string;
		selectedPhoneSecondaryCountryId?: string;
		selectedPhoneSecondary?: string;
		selectedFatherTitleId?: string;
		fatherName?: string;
		selectedGuardianTitleId?: string;
		selectedGuardianPhoneCountryId?: string;
		selectedIdentityTypeId?: string;
		identityNo?: string;
		dateOfBirth?: string;
		dateOfBirthMax?: string;
		guardianName?: string;
		guardianPhone?: string;
		selectedBloodTypeId?: string;
	}>();
</script>

<div class="flex flex-col gap-4">
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="phone-primary" className="shrink-0 sm:w-36 font-bold">Primary Phone</DaisyUiLabel>
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
				<DaisyUiInputField bind:value={selectedPhone} inputType="tel" className="d-join-item" />
			</DaisyUiJoin>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="phone-secondary" className="shrink-0 sm:w-36">Secondary Phone</DaisyUiLabel>
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
				<DaisyUiInputField bind:value={selectedPhoneSecondary} inputType="tel" className="d-join-item" />
			</DaisyUiJoin>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="identity" className="shrink-0 sm:w-36 font-bold">Identity</DaisyUiLabel>
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
				<DaisyUiInputField bind:value={identityNo} inputType="text" className="d-join-item" />
			</DaisyUiJoin>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="date-of-birth" className="shrink-0 sm:w-36">Date of Birth</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<input
				id="date-of-birth"
				type="date"
				class="d-input w-full"
				bind:value={dateOfBirth}
				max={dateOfBirthMax}
			/>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="guardian-name" className="shrink-0 sm:w-36 font-bold">Father Name</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiJoin>
				<DaisyUiSelect
					bind:value={selectedFatherTitleId}
					optionHeader="Select a title"
					className="d-join-item"
				>
					{#each titleData as data (data.id)}
						<option value={String(data.id)}>{data.name}</option>
					{/each}
				</DaisyUiSelect>
				<DaisyUiInputField bind:value={fatherName} inputType="text" className="d-join-item"/>
			</DaisyUiJoin>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="guardian-name" className="shrink-0 sm:w-36">Guardian Name</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiJoin>
				<DaisyUiSelect
					bind:value={selectedGuardianTitleId}
					optionHeader="Select a title"
					className="d-join-item"
				>
					{#each titleData as data (data.id)}
						<option value={String(data.id)}>{data.name}</option>
					{/each}
				</DaisyUiSelect>
				<DaisyUiInputField bind:value={guardianName} inputType="text" className="d-join-item"/>
			</DaisyUiJoin>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="guardian-phone" className="shrink-0 sm:w-36">Guardian Phone</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiJoin>
				<DaisyUiSelect
					bind:value={selectedGuardianPhoneCountryId}
					optionHeader="Select country code ..."
					className="min-w-20 d-join-item"
				>
					{#each countryData as data (data.id)}
						<option value={String(data.id)} class="gap-5"
							>{data.countryCallingCode} [{data.code.toUpperCase()}]</option
						>
					{/each}
				</DaisyUiSelect>
				<DaisyUiInputField bind:value={guardianPhone} inputType="tel" className="d-join-item" />
			</DaisyUiJoin>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
		<DaisyUiLabel forText="blood-type" className="shrink-0 sm:w-36">Blood Type</DaisyUiLabel>
		<div class="max-w-80 flex-1">
			<DaisyUiSelect bind:value={selectedBloodTypeId} optionHeader="Select a blood type ...">
				{#each bloodTypeData as data (data.id)}
					<option value={String(data.id)}>{data.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>
</div>
