<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBodyAction from '$lib/component/library/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiSkeleton from '$lib/component/library/daisyui/skeleton/DaisyUiSkeleton.svelte';

	import { getSpecialization } from '$lib/remote/table/master-table/specialization.remote';
	import { getStaffType } from '$lib/remote/table/master-table/staff-type.remote';
	import { getDepartment } from '$lib/remote/table/master-table/department.remote';
	import { getUserGroup } from '$lib/remote/table/information-table/user-group.remote';
	import { getCountry } from '$lib/remote/table/master-table/country.remote';
	import { getGender } from '$lib/remote/table/master-table/gender.remote';
	import { getIdentityType } from '$lib/remote/table/master-table/identity-type.remote';
	import { getMaritalStatus } from '$lib/remote/table/master-table/marial-status.remote';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { getStaffEmploymentType } from '$lib/remote/table/master-table/staff-employment-type.remote';
	import { getState } from '$lib/remote/table/master-table/state.remote';
	import { getCity } from '$lib/remote/table/master-table/city.remote';
	import { getPostalCode } from '$lib/remote/table/master-table/postal-code.remote';
	import type {
		CitySchema,
		CountrySchema,
		DepartmentSchema,
		GenderSchema,
		IdentityTypeSchema,
		MaritalStatusSchema,
		PostalCodeSchema,
		SpecializationSchema,
		StaffEmploymentTypeSchema,
		StaffTypeSchema,
		StateSchema,
		TitleSchema,
		UserGroupSchema
	} from '$lib/server/db/schema-type';
	import { getTitle } from '$lib/remote/table/master-table/title.remote';
	import { createStaffWithUser } from '$lib/remote/table/information-table/staff.remote';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import LAdministrationStaffRegistrationFirstColumn from '$lib/component/local/private/heka/administration/staff-registration/LAdministrationStaffRegistrationFirstColumn.svelte';
	import LAdministrationStaffRegistrationSecondColumn from '$lib/component/local/private/heka/administration/staff-registration/LAdministrationStaffRegistrationSecondColumn.svelte';
	import LAdministrationStaffRegistrationThirdColumn from '$lib/component/local/private/heka/administration/staff-registration/LAdministrationStaffRegistrationThirdColumn.svelte';
	import LAdministrationStaffRegistrationMoreInfo from '$lib/component/local/private/heka/administration/staff-registration/LAdministrationStaffRegistrationMoreInfo.svelte';
	import LAdministrationStaffRegistrationPermissions from '$lib/component/local/private/heka/administration/staff-registration/LAdministrationStaffRegistrationPermissions.svelte';
	import { authClient } from '$lib/auth/client';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';

	let routerUtil = new RouterUtil();
	const dateTimeUtil = new DateTimeUtil();
	// data list
	let titleData: TitleSchema[] = $state([]);
	let staffTypeData: StaffTypeSchema[] = $state([]);
	let departmentData: DepartmentSchema[] = $state([]);
	let specializationData: SpecializationSchema[] = $state([]);
	let genderData: GenderSchema[] = $state([]);
	let maritalStatusData: MaritalStatusSchema[] = $state([]);
	let countryData: CountrySchema[] = $state([]);
	let identityTypeData: IdentityTypeSchema[] = $state([]);
	let userGroupData: UserGroupSchema[] = $state([]);
	let staffEmploymentTypeData: StaffEmploymentTypeSchema[] = $state(
		[]
	);
	let stateData: StateSchema[] = $state([]);
	let cityData: CitySchema[] = $state([]);
	let postalCodeData: PostalCodeSchema[] = $state([]);

	// select value list
	let selectedTitleId: string = $state('');
	let selectedStaffCode: string = $state('');
	let selectedFirstName: string = $state('');
	let selectedMiddleName: string = $state('');
	let selectedLastName: string = $state('');
	let selectedEmail: string = $state('');
	let selectedGenderId: string = $state('');
	let selectedMaritalStatusId: string = $state('');
	let selectedPhoneCountryId: string = $state('');
	let selectedPhone: string = $state('');
	let selectedPhoneSecondaryCountryId: string = $state('');
	let selectedPhoneSecondary: string = $state('');
	let selectedStaffEmploymentTypeId: string = $state('');
	let selectedEducation: string = $state('');
	let selectedDesignation: string = $state('');
	let selectedDepartmentId: string = $state('');
	let selectedSpecializationId: string = $state('');
	let selectedCountryId: string = $state('');
	let selectedStateId: string = $state('');
	let selectedCityId: string = $state('');
	let selectedPostalCodeId: string = $state('');
	let selectedStaffTypeId: string = $state('');
	let selectedIdentityTypeId: string = $state('');
	let selectedIdentityNumber: string = $state('');
	let selectedDateOfBirth: string = $state('');
	let selectedJoinDate: string = $state(dateTimeUtil.getTodayDateString());
	let selectedResignDate: string = $state('');
	let selectedAddress: string = $state('');
	let selectedRemark: string = $state('');
	let selectedUserGroups: number[] = $state([]);
	let isActive: boolean = $state(true);
	let isSuperAdmin: boolean = $state(false);
	let isLocked: boolean = $state(false);

	// Get selected objects from IDs
	let selectedCountry = $derived(
		countryData.find((c) => String(c.id) === selectedCountryId) ||
			({} as CountrySchema)
	);
	let selectedState = $derived(
		stateData.find((s) => String(s.id) === selectedStateId) ||
			({} as StateSchema)
	);
	let selectedCity = $derived(
		cityData.find((c) => String(c.id) === selectedCityId) ||
			({} as CitySchema)
	);
	let selectedPostalCode = $derived(
		postalCodeData.find(
			(p) => String(p.id) === selectedPostalCodeId
		) || ({} as PostalCodeSchema)
	);

	// Filtered data based on selections
	let filteredStateData = $derived(
		selectedCountry?.id
			? stateData.filter(
					(state) => state.countryId === selectedCountry.id
				)
			: []
	);
	let filteredCityData = $derived(
		selectedState?.id
			? cityData.filter((city) => city.stateId === selectedState.id)
			: []
	);
	let filteredPostalCodeData = $derived(
		selectedCity?.id
			? postalCodeData.filter(
					(postalCode) => postalCode.cityId === selectedCity.id
				)
			: []
	);

	// Reset dependent fields when parent changes
	$effect(() => {
		if (selectedCountryId) {
			if (
				!selectedCountry?.id ||
				(selectedStateId &&
					selectedState?.countryId !== selectedCountry.id)
			) {
				selectedStateId = '';
				selectedCityId = '';
				selectedPostalCodeId = '';
			}
		}
	});

	$effect(() => {
		if (selectedStateId) {
			if (
				!selectedState?.id ||
				(selectedCityId && selectedCity?.stateId !== selectedState.id)
			) {
				selectedCityId = '';
				selectedPostalCodeId = '';
			}
		}
	});

	$effect(() => {
		if (selectedCityId) {
			if (
				!selectedCity?.id ||
				(selectedPostalCodeId &&
					selectedPostalCode?.cityId !== selectedCity.id)
			) {
				selectedPostalCodeId = '';
			}
		}
	});

	// constructor
	const lifeCycleUtil = new LifeCycleUtil();

	lifeCycleUtil.onMount(() => {
		fetchInitialFieldData();
	});

	async function fetchInitialFieldData() {
		titleData = await getTitle();
		staffTypeData = await getStaffType();
		departmentData = await getDepartment();
		specializationData = await getSpecialization();
		genderData = await getGender();
		maritalStatusData = await getMaritalStatus();
		countryData = await getCountry();
		identityTypeData = await getIdentityType();
		userGroupData = await getUserGroup();
		staffEmploymentTypeData = await getStaffEmploymentType();
		stateData = await getState();
		cityData = await getCity();
		postalCodeData = await getPostalCode();
	}

	const toastService = new ToastService();
	let isLoading = $state(false);

	async function handleOnSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const fd = new FormData(form);

		// Validation
		if (!selectedFirstName?.trim()) {
			toastService.addToast(
				'First name is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!selectedEmail?.trim()) {
			toastService.addToast(
				'Email is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!selectedStaffEmploymentTypeId) {
			toastService.addToast(
				'Employment Type is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (selectedUserGroups.length === 0) {
			toastService.addToast(
				'At Least One User Group is required',
				StatusColorEnum.ERROR
			);
			return;
		}

		// Build full name
		const fullName =
			[selectedFirstName, selectedMiddleName, selectedLastName]
				.filter(Boolean)
				.join(' ') || selectedFirstName;

		// Build phone numbers with country codes
		let phonePrimary: string | undefined;
		if (selectedPhoneCountryId && selectedPhone) {
			const country = countryData.find(
				(c) => String(c.id) === selectedPhoneCountryId
			);
			phonePrimary = country
				? `${country.countryCallingCode}${selectedPhone}`
				: selectedPhone;
		}

		let phoneSecondary: string | undefined;
		if (selectedPhoneSecondaryCountryId && selectedPhoneSecondary) {
			const country = countryData.find(
				(c) => String(c.id) === selectedPhoneSecondaryCountryId
			);
			phoneSecondary = country
				? `${country.countryCallingCode}${selectedPhoneSecondary}`
				: selectedPhoneSecondary;
		}

		isLoading = true;
		try {
			const result = await createStaffWithUser({
				email: selectedEmail.trim(),
				name: fullName,
				code: selectedStaffCode.trim(),
				firstName: selectedFirstName.trim(),
				middleName: selectedMiddleName.trim() || undefined,
				lastName: selectedLastName.trim(),
				phonePrimary,
				phoneSecondary: phoneSecondary || undefined,
				dateOfBirth: selectedDateOfBirth || undefined,
				address: selectedAddress || undefined,
				remark: selectedRemark || undefined,
				identityNo: selectedIdentityNumber.trim() || undefined,
				titleId: selectedTitleId
					? Number(selectedTitleId)
					: undefined,
				genderId: selectedGenderId
					? Number(selectedGenderId)
					: undefined,
				maritalStatusId: selectedMaritalStatusId
					? Number(selectedMaritalStatusId)
					: undefined,
				staffEmploymentTypeId: selectedStaffEmploymentTypeId
					? Number(selectedStaffEmploymentTypeId)
					: undefined,
				staffTypeId: selectedStaffTypeId
					? Number(selectedStaffTypeId)
					: undefined,
				education: selectedEducation.trim() || undefined,
				designation: selectedDesignation.trim() || undefined,
				departmentId: selectedDepartmentId
					? Number(selectedDepartmentId)
					: undefined,
				specializationId: selectedSpecializationId
					? Number(selectedSpecializationId)
					: undefined,
				countryId: selectedCountryId
					? Number(selectedCountryId)
					: undefined,
				stateId: selectedStateId
					? Number(selectedStateId)
					: undefined,
				cityId: selectedCityId ? Number(selectedCityId) : undefined,
				postalCodeId: selectedPostalCodeId
					? Number(selectedPostalCodeId)
					: undefined,
				identityTypeId: selectedIdentityTypeId
					? Number(selectedIdentityTypeId)
					: undefined,
				joinDate: selectedJoinDate || undefined,
				resignDate: selectedResignDate || undefined,
				isActive,
				isSuperAdmin,
				isLocked,
				userGroupIds:
					selectedUserGroups.length > 0
						? selectedUserGroups
						: undefined
			});

			toastService.addToast(
				`Staff created successfully!`,
				StatusColorEnum.SUCCESS
			);
			
			const { error } = await authClient.requestPasswordReset({
				email: selectedEmail.trim(),
				redirectTo: routerUtil.getResetRedirectUrl(),
			});

			if (error) {
				toastService.addToast(
					error.message ?? 'Failed to send reset link.',
					StatusColorEnum.ERROR
				);
				return;
			}
			
			toastService.addToast(
				'Reset password email has been sent to the staff.',
				StatusColorEnum.INFO
			);

			// Reset form
			selectedStaffCode = '';
			selectedTitleId = '';
			selectedFirstName = '';
			selectedMiddleName = '';
			selectedLastName = '';
			selectedEmail = '';
			selectedGenderId = '';
			selectedMaritalStatusId = '';
			selectedPhoneCountryId = '';
			selectedPhone = '';
			selectedPhoneSecondaryCountryId = '';
			selectedPhoneSecondary = '';
			selectedStaffEmploymentTypeId = '';
			selectedEducation = '';
			selectedDesignation = '';
			selectedDepartmentId = '';
			selectedSpecializationId = '';
			selectedCountryId = '';
			selectedStateId = '';
			selectedCityId = '';
			selectedPostalCodeId = '';
			selectedStaffTypeId = '';
			selectedIdentityTypeId = '';
			selectedIdentityNumber = '';
			selectedDateOfBirth = '';
			selectedJoinDate = dateTimeUtil.getTodayDateString();
			selectedResignDate = '';
			selectedAddress = '';
			selectedRemark = '';
			selectedUserGroups = [];
			isActive = true;
			isSuperAdmin = false;
			isLocked = false;
		} catch (error) {
			let message: string | null = null;

			if (error && typeof error === 'object') {
				const errAny = error as any;

				// SvelteKit remote `command` wraps server errors in HttpError,
				// with the original message living at `error.body.message`.
				if (errAny.body && typeof errAny.body.message === 'string') {
					message = errAny.body.message;
				} else if (typeof errAny.message === 'string') {
					message = errAny.message;
				}
			}

			if (!message) {
				message = 'Failed to create staff. Please try again.';
			}

			toastService.addToast(message, StatusColorEnum.ERROR);
		} finally {
			isLoading = false;
		}
	}
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<form onsubmit={handleOnSubmit}>
			<DaisyUiCardBodyTitle className="mb-5"
				>Profile Details</DaisyUiCardBodyTitle
			>
			<!-- Profile + Main form grid: responsive -->
			<div
				class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10"
			>
				<!-- Profile block: centered on mobile, then fixed width on lg+ -->
				<div
					class="flex shrink-0 flex-col items-center gap-4 sm:flex-row sm:items-start lg:flex-col lg:items-center"
				>
					<DaisyUiSkeleton
						className="size-28 rounded-full sm:size-32 lg:size-36"
					/>
					<div class="flex flex-col gap-2">
						<DaisyUiButton className="d-btn-error d-btn-sm"
							>Remove</DaisyUiButton
						>
					</div>
				</div>

				<!-- Form columns: 1 col mobile, 2 md, 3 xl -->
				<div
					class="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
				>
					<!-- Column 1 -->
					<LAdministrationStaffRegistrationFirstColumn
						{titleData}
						{genderData}
						{maritalStatusData}
						bind:selectedStaffCode
						bind:selectedTitleId
						bind:selectedFirstName
						bind:selectedMiddleName
						bind:selectedLastName
						bind:selectedEmail
						bind:selectedGenderId
						bind:selectedMaritalStatusId
					/>

					<!-- Column 2 -->
					<LAdministrationStaffRegistrationSecondColumn
						{countryData}
						{staffTypeData}
						{staffEmploymentTypeData}
						bind:selectedPhoneCountryId
						bind:selectedPhone
						bind:selectedPhoneSecondaryCountryId
						bind:selectedPhoneSecondary
						bind:selectedDateOfBirth
						bind:selectedStaffTypeId
						bind:selectedStaffEmploymentTypeId
						bind:selectedEducation
						bind:selectedDesignation
					/>

					<!-- Column 3 -->
					<LAdministrationStaffRegistrationThirdColumn
						{countryData}
						{stateData}
						{cityData}
						{postalCodeData}
						{departmentData}
						{specializationData}
						{identityTypeData}
						{filteredStateData}
						{filteredCityData}
						{filteredPostalCodeData}
						{selectedCountry}
						{selectedState}
						{selectedCity}
						bind:selectedCountryId
						bind:selectedStateId
						bind:selectedCityId
						bind:selectedPostalCodeId
						bind:selectedDepartmentId
						bind:selectedSpecializationId
						bind:selectedIdentityTypeId
						bind:selectedIdentityNumber
					/>
				</div>
			</div>

			<!-- More Info: 1 col mobile, 2 cols md+ -->
			<LAdministrationStaffRegistrationMoreInfo
				bind:selectedAddress
				bind:selectedRemark
			/>

			<!-- Permissions: stack on mobile, row on md+ -->
			<LAdministrationStaffRegistrationPermissions
				{userGroupData}
				bind:selectedUserGroups
				bind:selectedJoinDate
				bind:selectedResignDate
				bind:isActive
				bind:isSuperAdmin
				bind:isLocked
			/>

			<!-- Action Buttons -->
			<DaisyUiCardBodyAction className="mt-6">
				<DaisyUiButton
					type="submit"
					className="d-btn-wide d-btn-primary"
					disabled={isLoading}
					>{isLoading ? 'Saving...' : 'Save'}</DaisyUiButton
				>
			</DaisyUiCardBodyAction>
		</form>
	</DaisyUiCardBody>
</DaisyUiCard>
