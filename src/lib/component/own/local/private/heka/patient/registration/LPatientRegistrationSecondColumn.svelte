<script lang="ts">
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
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
		guardianPhone = $bindable()
	} = $props<{
		titleData: TitleSchema[];
		countryData: CountrySchema[];
		identityTypeData: IdentityTypeSchema[];
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
	}>();

	let ageYear = $state('');
	let ageMonth = $state('');
	let ageDay = $state('');
	let skipNextDobToAgeSync = $state(false);

	function getAgeFromBirthDate(dob: string): {
		years: number;
		months: number;
		days: number;
	} {
		const birth = new Date(dob);
		const today = new Date();
		let years = today.getFullYear() - birth.getFullYear();
		let months = today.getMonth() - birth.getMonth();
		let days = today.getDate() - birth.getDate();
		if (days < 0) {
			months -= 1;
			const prevMonth = new Date(
				today.getFullYear(),
				today.getMonth(),
				0
			);
			days += prevMonth.getDate();
		}
		if (months < 0) {
			years -= 1;
			months += 12;
		}
		return { years, months, days };
	}

	function getBirthDateFromAge(
		years: number,
		months: number,
		days: number
	): string {
		const d = new Date();
		d.setDate(d.getDate() - days);
		d.setMonth(d.getMonth() - months);
		d.setFullYear(d.getFullYear() - years);
		return d.toISOString().slice(0, 10);
	}

	function syncAgeFromDateOfBirth(): void {
		const dob = dateOfBirth ?? '';
		if (!dob || dob.length < 10) {
			ageYear = '';
			ageMonth = '';
			ageDay = '';
			return;
		}
		const age = getAgeFromBirthDate(dob);
		ageYear = String(age.years);
		ageMonth = String(age.months);
		ageDay = String(age.days);
	}

	// dateOfBirth → age: when user picks a date, fill age fields (skip when change came from age fields)
	$effect(() => {
		if (skipNextDobToAgeSync) {
			skipNextDobToAgeSync = false;
			return;
		}
		const dob = dateOfBirth ?? '';
		if (!dob || dob.length < 10) {
			ageYear = '';
			ageMonth = '';
			ageDay = '';
			return;
		}
		syncAgeFromDateOfBirth();
	});

	// Age fields → date of birth: when user types age, compute and set date
	$effect(() => {
		const y = String(ageYear ?? '').trim();
		if (!y) {
			if ((dateOfBirth ?? '') !== '') {
				dateOfBirth = '';
			}
			return;
		}
		const numY = Number(y);
		const numM =
			ageMonth != null && ageMonth !== ''
				? Math.min(11, Math.max(0, Number(ageMonth)))
				: 0;
		const numD =
			ageDay != null && ageDay !== ''
				? Math.max(0, Number(ageDay))
				: 0;
		const next = getBirthDateFromAge(numY, numM, numD);
		if (next !== (dateOfBirth ?? '')) {
			skipNextDobToAgeSync = true;
			dateOfBirth = next;
			ageYear = String(numY);
			ageMonth = String(numM);
			ageDay = String(numD);
		}
	});
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel
			forText="phone-primary"
			className="shrink-0 sm:w-36 font-bold"
			>Primary Phone</DaisyUiLabel
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
			className="shrink-0 sm:w-36">Secondary Phone</DaisyUiLabel
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
		<DaisyUiLabel
			forText="identity"
			className="shrink-0 sm:w-36 font-bold">Identity</DaisyUiLabel
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
					bind:value={identityNo}
					inputType="text"
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
		<div class="flex max-w-80 flex-1 flex-wrap items-center gap-2">
			<DaisyUiInputField
				id="date-of-birth"
				bind:value={dateOfBirth}
				inputType="date"
				className="shrink-0"
				max={dateOfBirthMax}
			/>
			<DaisyUiJoin>
				<DaisyUiInputField
					bind:value={ageYear}
					inputPlaceholderText="Age Year"
					inputType="number"
					className="d-join-item"
				/>
				<DaisyUiInputField
					bind:value={ageMonth}
					inputPlaceholderText="Age Month"
					inputType="number"
					className="d-join-item"
				/>
				<DaisyUiInputField
					bind:value={ageDay}
					inputPlaceholderText="Age Day"
					inputType="number"
					className="d-join-item"
				/>
			</DaisyUiJoin>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel
			forText="guardian-name"
			className="shrink-0 sm:w-36 font-bold">Father Name</DaisyUiLabel
		>
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
				<DaisyUiInputField
					bind:value={fatherName}
					inputType="text"
					className="d-join-item"
				/>
			</DaisyUiJoin>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel forText="guardian-name" className="shrink-0 sm:w-36"
			>Guardian Name</DaisyUiLabel
		>
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
				<DaisyUiInputField
					bind:value={guardianName}
					inputType="text"
					className="d-join-item"
				/>
			</DaisyUiJoin>
		</div>
	</div>
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
	>
		<DaisyUiLabel
			forText="guardian-phone"
			className="shrink-0 sm:w-36">Guardian Phone</DaisyUiLabel
		>
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
				<DaisyUiInputField
					bind:value={guardianPhone}
					inputType="tel"
					className="d-join-item"
				/>
			</DaisyUiJoin>
		</div>
	</div>
</div>
