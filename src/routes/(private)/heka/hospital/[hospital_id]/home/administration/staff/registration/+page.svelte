<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBodyAction from '$lib/component/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiSkeleton from '$lib/component/daisyui/skeleton/DaisyUiSkeleton.svelte';

	import type { SpecializationWithRelations } from '$lib/model/type/specialization-with-relations.type';
	import type {
		PatientRegBloodTypeRow,
		PatientRegCityRow,
		PatientRegCountryRow,
		PatientRegGenderRow,
		PatientRegIdentityTypeRow,
		PatientRegMaritalStatusRow,
		PatientRegNationalityRow,
		PatientRegPostalCodeRow,
		PatientRegStateRow,
		PatientRegTitleRow,
		StaffRegDepartmentRow,
		StaffRegHospitalBranchRow,
		StaffRegStaffEmploymentTypeRow,
		StaffRegStaffTypeRow,
		StaffRegUserGroupRow
	} from '$lib/model/type/heka/staff-reg-ui.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { toastLine } from '$lib/util/toast-copy.util';
	import LAdministrationStaffRegistrationFirstColumn from '$lib/component/own/local/private/heka/administration/staff/registration/LStaffRegistrationFirstColumn.svelte';
	import { authClient } from '$lib/auth/client';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import LStaffRegistrationThirdColumn from '$lib/component/own/local/private/heka/administration/staff/registration/LStaffRegistrationThirdColumn.svelte';
	import LStaffRegistrationSecondColumn from '$lib/component/own/local/private/heka/administration/staff/registration/LStaffRegistrationSecondColumn.svelte';
	import LStaffRegistrationMoreInfo from '$lib/component/own/local/private/heka/administration/staff/registration/LStaffRegistrationMoreInfo.svelte';
	import LStaffRegistrationPermissions from '$lib/component/own/local/private/heka/administration/staff/registration/LStaffRegistrationPermissions.svelte';
	import DaisyUiDivider from '$lib/component/daisyui/divider/DaisyUiDivider.svelte';
	import DaisyUiFileInput from '$lib/component/daisyui/fileinput/DaisyUiFileInput.svelte';
	import LStaffRegistrationLicenseAndSignatureModal from '$lib/component/own/local/private/heka/administration/staff/registration/modal/LStaffRegistrationLicenseAndSignatureModal.svelte';
	import { getStaffPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import { StringUtil } from '$lib/util/string.util.svelte';

	let routerUtil = new RouterUtil();
	const dateTimeUtil = new DateTimeUtil();
	// data list
	let titleData: PatientRegTitleRow[] = $state([]);
	let staffTypeData: StaffRegStaffTypeRow[] = $state([]);
	let departmentData: StaffRegDepartmentRow[] = $state([]);
	let branchData: StaffRegHospitalBranchRow[] = $state([]);
	let specializationData: SpecializationWithRelations[] = $state([]);
	let genderData: PatientRegGenderRow[] = $state([]);
	let maritalStatusData: PatientRegMaritalStatusRow[] = $state([]);
	let countryData: PatientRegCountryRow[] = $state([]);
	let bloodTypeData: PatientRegBloodTypeRow[] = $state([]);
	let identityTypeData: PatientRegIdentityTypeRow[] = $state([]);
	let userGroupData: StaffRegUserGroupRow[] = $state([]);
	let staffEmploymentTypeData: StaffRegStaffEmploymentTypeRow[] = $state(
		[]
	);
	let stateData: PatientRegStateRow[] = $state([]);
	let cityData: PatientRegCityRow[] = $state([]);
	let postalCodeData: PatientRegPostalCodeRow[] = $state([]);
	let nationalityData: PatientRegNationalityRow[] = $state([]);

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
	let selectedJoinDate: string = $state(
		dateTimeUtil.getTodayDateString()
	);
	let selectedResignDate: string = $state('');
	let selectedAddress: string = $state('');
	let selectedRemark: string = $state('');
	let selectedBloodTypeId: string = $state('');
	let selectedNationalityId: string = $state('');
	let selectedUserGroups: number[] = $state([]);
	let selectedBranchIds: string[] = $state([]);
	let isActive: boolean = $state(true);
	let isSuperAdmin: boolean = $state(false);
	let isLocked: boolean = $state(false);
	let photoFile: File | null = $state(null);
	let photoPreviewUrl: string = $state('');
	let photoUploading: boolean = $state(false);
	let removePhotoRequested: boolean = $state(false);
	let photoInputEl: HTMLInputElement | undefined = $state();
	let licenseAndSignatureModalOpen = $state(false);
	let selectedLicenseNo: string = $state('');
	let selectedLicenseExpiryDate: string = $state('');
	let signatureFile: File | null = $state(null);
	let selectedSignatureImageUrl: string = $state('');
	let selectedSignatureText: string = $state('');

	// After creating a new staff, hide the Save button until user clicks New
	let disableCreateSave: boolean = $state(false);
	const viewId = $derived(page.url.searchParams.get('view'));
	const editId = $derived(page.url.searchParams.get('edit'));
	const isViewMode = $derived(!!viewId);
	const isEditMode = $derived(!!editId);
	let staffEditId = $state<string | null>(null);

	function showLicenseAndSignatureModal() {
		licenseAndSignatureModalOpen = true;
	}

	// Get selected objects from IDs
	let selectedCountry = $derived(
		countryData.find((c) => String(c.id) === selectedCountryId) ||
			({} as PatientRegCountryRow)
	);
	let selectedState = $derived(
		stateData.find((s) => String(s.id) === selectedStateId) ||
			({} as PatientRegStateRow)
	);
	let selectedCity = $derived(
		cityData.find((c) => String(c.id) === selectedCityId) ||
			({} as PatientRegCityRow)
	);
	let selectedPostalCode = $derived(
		postalCodeData.find(
			(p) => String(p.id) === selectedPostalCodeId
		) || ({} as PatientRegPostalCodeRow)
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
	let lastLoadedStaffId: string | null = $state(null);

	lifeCycleUtil.onMount(() => {
		fetchInitialFieldData();
	});

	// When URL has ?view= or ?edit= and dropdowns are ready, load staff into form (reacts to URL change)
	$effect(() => {
		const id = viewId || editId;
		if (!id || typeof id !== 'string') {
			lastLoadedStaffId = null;
			return;
		}
		if (titleData.length === 0) return;
		if (lastLoadedStaffId === id) return;
		lastLoadedStaffId = id;
		loadStaffIntoForm(id);
	});

	function staffRegistrationApiUrl(
		hid: string,
		params: Record<string, string>
	) {
		const usp = new URLSearchParams(params);
		return `/api/heka/hospital/${hid}/home/administration/staff/registration?${usp.toString()}`;
	}

	async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
		const res = await fetch(url, {
			credentials: 'include',
			cache: 'no-store',
			...init
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error(
				(data && typeof data.error === 'string' && data.error) ||
					`Request failed (${res.status})`
			);
		}
		return (await res.json()) as T;
	}

	async function loadStaffIntoForm(id: string) {
		const hid =
			typeof page.params.hospital_id === 'string'
				? page.params.hospital_id
				: '';
		const staff = hid
			? await getJson<any>(
					staffRegistrationApiUrl(hid, {
						mode: 'staff',
						id
					}),
					{ method: 'GET' }
				)
			: null;
		if (!staff) return;
		staffEditId = editId ? id : null;
		selectedStaffCode = staff.code ?? '';
		selectedTitleId =
			staff.titleId != null ? String(staff.titleId) : '';
		selectedFirstName = staff.firstName ?? '';
		selectedMiddleName = staff.middleName ?? '';
		selectedLastName = staff.lastName ?? '';
		selectedEmail = StringUtil.displayEmail(
			(staff as { user?: { email?: string | null } }).user?.email ??
				''
		);
		selectedGenderId =
			staff.genderId != null ? String(staff.genderId) : '';
		selectedMaritalStatusId =
			staff.maritalStatusId != null
				? String(staff.maritalStatusId)
				: '';
		// Phone: use phone_primary_country_id / phone_secondary_country_id when set, else parse from full number
		const phonePrimary = staff.phonePrimary ?? '';
		const phoneSecondary = staff.phoneSecondary ?? '';
		const staffPrimaryCountryId = (
			staff as { phonePrimaryCountryId?: number | null }
		).phonePrimaryCountryId;
		const staffSecondaryCountryId = (
			staff as { phoneSecondaryCountryId?: number | null }
		).phoneSecondaryCountryId;
		if (staffPrimaryCountryId != null) {
			selectedPhoneCountryId = String(staffPrimaryCountryId);
			const country = countryData.find(
				(c) => c.id === staffPrimaryCountryId
			);
			selectedPhone =
				country?.countryCallingCode &&
				phonePrimary.startsWith(country.countryCallingCode)
					? phonePrimary
							.slice(country.countryCallingCode.length)
							.trim()
					: phonePrimary;
		} else {
			const matchPrimary = countryData.find(
				(c) =>
					c.countryCallingCode &&
					phonePrimary.startsWith(c.countryCallingCode)
			);
			if (matchPrimary) {
				selectedPhoneCountryId = String(matchPrimary.id);
				selectedPhone = phonePrimary
					.slice(matchPrimary.countryCallingCode?.length ?? 0)
					.trim();
			} else {
				selectedPhoneCountryId = '';
				selectedPhone = phonePrimary;
			}
		}
		if (staffSecondaryCountryId != null) {
			selectedPhoneSecondaryCountryId = String(
				staffSecondaryCountryId
			);
			const country = countryData.find(
				(c) => c.id === staffSecondaryCountryId
			);
			selectedPhoneSecondary =
				country?.countryCallingCode &&
				phoneSecondary.startsWith(country.countryCallingCode)
					? phoneSecondary
							.slice(country.countryCallingCode.length)
							.trim()
					: phoneSecondary;
		} else {
			const matchSecondary = countryData.find(
				(c) =>
					c.countryCallingCode &&
					phoneSecondary.startsWith(c.countryCallingCode)
			);
			if (matchSecondary) {
				selectedPhoneSecondaryCountryId = String(matchSecondary.id);
				selectedPhoneSecondary = phoneSecondary
					.slice(matchSecondary.countryCallingCode?.length ?? 0)
					.trim();
			} else {
				selectedPhoneSecondaryCountryId = '';
				selectedPhoneSecondary = phoneSecondary;
			}
		}
		selectedStaffEmploymentTypeId =
			staff.staffEmploymentTypeId != null
				? String(staff.staffEmploymentTypeId)
				: '';
		selectedEducation =
			(staff as { staffDetail?: { education?: string } }).staffDetail
				?.education ?? '';
		selectedDesignation =
			(staff as { staffDetail?: { designation?: string } })
				.staffDetail?.designation ?? '';
		selectedDepartmentId =
			(staff as { staffDepartments?: { departmentId: number }[] })
				.staffDepartments?.[0]?.departmentId != null
				? String(
						(
							staff as {
								staffDepartments: { departmentId: number }[];
							}
						).staffDepartments[0].departmentId
					)
				: '';
		selectedSpecializationId =
			staff.specializationId != null
				? String(staff.specializationId)
				: '';
		selectedCountryId =
			staff.countryId != null ? String(staff.countryId) : '';
		selectedStateId =
			staff.stateId != null ? String(staff.stateId) : '';
		selectedCityId = staff.cityId != null ? String(staff.cityId) : '';
		selectedPostalCodeId =
			staff.postalCodeId != null ? String(staff.postalCodeId) : '';
		selectedStaffTypeId =
			staff.staffTypeId != null ? String(staff.staffTypeId) : '';
		selectedIdentityTypeId =
			staff.identityTypeId != null
				? String(staff.identityTypeId)
				: '';
		selectedIdentityNumber = staff.identityNo ?? '';
		selectedNationalityId =
			staff.nationalityId != null ? String(staff.nationalityId) : '';
		selectedDateOfBirth = staff.dateOfBirth
			? typeof staff.dateOfBirth === 'string'
				? staff.dateOfBirth
				: new Date(staff.dateOfBirth).toISOString().slice(0, 10)
			: '';
		selectedAddress = staff.address ?? '';
		selectedRemark = staff.remark ?? '';
		selectedBloodTypeId =
			(staff as { staffDetail?: { bloodTypeId?: number } })
				.staffDetail?.bloodTypeId != null
				? String(
						(staff as { staffDetail: { bloodTypeId: number } })
							.staffDetail.bloodTypeId
					)
				: '';
		// Deduplicate when loading; filter to current hospital's user groups only
		const userGroupIdsThisHospital = new Set(
			userGroupData.map((g) => g.id)
		);
		selectedUserGroups = [
			...new Set(
				(
					(staff as { staffUserGroups?: { userGroupId: number }[] })
						.staffUserGroups ?? []
				)
					.map((ug) => ug.userGroupId)
					.filter((id) => userGroupIdsThisHospital.has(id))
			)
		];
		const branchIdsFromStaff = (
			(staff as { staffBranches?: { branchId: string }[] })
				.staffBranches ?? []
		).map((sb) => sb.branchId);
		const branchIdSet = new Set(branchData.map((b) => b.id));
		selectedBranchIds = [
			...new Set(
				branchIdsFromStaff.filter((id) => branchIdSet.has(id))
			)
		];
		isActive = staff.statusId === StatusEnum.ACTIVE;
		isLocked = staff.statusId === StatusEnum.LOCKED;
		const detail = (
			staff as {
				staffDetail?: {
					licenseNo?: string;
					licenseExpiryDate?: string | Date;
					signatureImageUrl?: string;
					signatureText?: string;
				};
			}
		).staffDetail;
		selectedLicenseNo = detail?.licenseNo ?? '';
		selectedLicenseExpiryDate = detail?.licenseExpiryDate
			? typeof detail.licenseExpiryDate === 'string'
				? detail.licenseExpiryDate
				: new Date(detail.licenseExpiryDate)
						.toISOString()
						.slice(0, 10)
			: '';
		selectedSignatureImageUrl = detail?.signatureImageUrl ?? '';
		selectedSignatureText = detail?.signatureText ?? '';
		photoPreviewUrl =
			getStaffPhotoDisplayUrl(staff.photoUrl) ?? staff.photoUrl ?? '';
		removePhotoRequested = false;
		selectedJoinDate = staff.joinDate
			? typeof staff.joinDate === 'string'
				? staff.joinDate
				: new Date(staff.joinDate).toISOString().slice(0, 10)
			: '';
		selectedResignDate = staff.resignDate
			? typeof staff.resignDate === 'string'
				? staff.resignDate
				: new Date(staff.resignDate).toISOString().slice(0, 10)
			: '';
	}

	async function fetchInitialFieldData() {
		const currentHospitalId =
			typeof page.params.hospital_id === 'string'
				? page.params.hospital_id
				: '';
		if (!currentHospitalId) return;

		const lookups = await getJson<{
			titleData: PatientRegTitleRow[];
			staffTypeData: StaffRegStaffTypeRow[];
			departmentData: StaffRegDepartmentRow[];
			branchData: StaffRegHospitalBranchRow[];
			specializationData: SpecializationWithRelations[];
			genderData: PatientRegGenderRow[];
			maritalStatusData: PatientRegMaritalStatusRow[];
			countryData: PatientRegCountryRow[];
			bloodTypeData: PatientRegBloodTypeRow[];
			identityTypeData: PatientRegIdentityTypeRow[];
			userGroupData: StaffRegUserGroupRow[];
			staffEmploymentTypeData: StaffRegStaffEmploymentTypeRow[];
			stateData: PatientRegStateRow[];
			cityData: PatientRegCityRow[];
			postalCodeData: PatientRegPostalCodeRow[];
			nationalityData: PatientRegNationalityRow[];
		}>(
			staffRegistrationApiUrl(currentHospitalId, { mode: 'lookups' }),
			{ method: 'GET' }
		);

		titleData = lookups.titleData;
		staffTypeData = lookups.staffTypeData;
		departmentData = lookups.departmentData;
		branchData = lookups.branchData;
		specializationData = lookups.specializationData;
		genderData = lookups.genderData;
		maritalStatusData = lookups.maritalStatusData;
		countryData = lookups.countryData;
		identityTypeData = lookups.identityTypeData;
		userGroupData = lookups.userGroupData;
		staffEmploymentTypeData = lookups.staffEmploymentTypeData;
		stateData = lookups.stateData;
		cityData = lookups.cityData;
		postalCodeData = lookups.postalCodeData;
		bloodTypeData = lookups.bloodTypeData;
		nationalityData = lookups.nationalityData;
		// Load staff when view/edit id is in URL (effect also handles URL changes; this covers initial mount with params)
		const id = viewId || editId;
		if (id && typeof id === 'string') {
			lastLoadedStaffId = id;
			await loadStaffIntoForm(id);
		}
	}

	const toastService = new ToastService();
	let isLoading = $state(false);

	function handlePhotoChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const allowed = [
			'image/jpeg',
			'image/png',
			'image/webp',
			'image/gif'
		];
		if (!allowed.includes(file.type)) {
			toastService.addToast(
				'Please choose a JPEG, PNG, WebP or GIF image.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			toastService.addToast(
				'Image must be 5MB or smaller.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
		photoPreviewUrl = URL.createObjectURL(file);
		photoFile = file;
		removePhotoRequested = false;
		input.value = '';
	}

	function handleRemovePhoto() {
		if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
		photoPreviewUrl = '';
		photoFile = null;
		removePhotoRequested = true;
		if (photoInputEl) photoInputEl.value = '';
	}

	async function handleOnSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!browser) return;
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
		if (selectedBranchIds.length === 0) {
			toastService.addToast(
				'At Least One Branch is required',
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
			// Store only local number in `phonePrimary`; country code is stored in `phonePrimaryCountryId`.
			phonePrimary = selectedPhone.trim();
		}

		let phoneSecondary: string | undefined;
		if (selectedPhoneSecondaryCountryId && selectedPhoneSecondary) {
			// Store only local number in `phoneSecondary`; country code is stored in `phoneSecondaryCountryId`.
			phoneSecondary = selectedPhoneSecondary.trim();
		}

		// Derive status from Active/Lock checkboxes
		let derivedStatusId: StatusEnum;
		if (isActive) {
			derivedStatusId = StatusEnum.ACTIVE;
		} else if (isLocked) {
			derivedStatusId = StatusEnum.LOCKED;
		} else {
			derivedStatusId = StatusEnum.INACTIVE;
		}

		isLoading = true;
		try {
			if (staffEditId) {
				const hid =
					typeof page.params.hospital_id === 'string'
						? page.params.hospital_id
						: '';
				const staff = hid
					? await getJson<any>(
							staffRegistrationApiUrl(hid, {
								mode: 'staff',
								id: staffEditId
							}),
							{ method: 'GET' }
						)
					: null;
				if (!staff) {
					toastService.addToast(
						toastLine(m.entity_staff(), m.toast_action_loaded_failed()),
						StatusColorEnum.ERROR
					);
					return;
				}

				const previousEmail =
					(staff as { user?: { email?: string | null } }).user?.email ??
					'';
				const previousName =
					(staff as { user?: { name?: string | null } }).user?.name ?? '';
				const userId =
					(staff as { user?: { id?: string | null } }).user?.id ?? '';

				const trimmedNewName = fullName.trim();
				const trimmedNewEmail = selectedEmail.trim();
				const shouldSendResetForEmailChange =
					trimmedNewEmail &&
					trimmedNewEmail !== previousEmail &&
					StringUtil.isNoEmail(previousEmail);

				await getJson(
					staffRegistrationApiUrl(hid, { mode: 'update' }),
					{
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({
							id: staffEditId,
							user: {
								id: userId,
								name:
									trimmedNewName && trimmedNewName !== previousName
										? trimmedNewName
										: undefined,
								email:
									trimmedNewEmail && trimmedNewEmail !== previousEmail
										? trimmedNewEmail
										: undefined
							},
							staff: {
								firstName: selectedFirstName.trim(),
								middleName: selectedMiddleName.trim() || undefined,
								lastName: selectedLastName.trim(),
								code: selectedStaffCode.trim() || undefined,
								phonePrimary: phonePrimary || undefined,
								phoneSecondary: phoneSecondary || undefined,
								phonePrimaryCountryId: selectedPhoneCountryId
									? Number(selectedPhoneCountryId)
									: undefined,
								phoneSecondaryCountryId: selectedPhoneSecondaryCountryId
									? Number(selectedPhoneSecondaryCountryId)
									: undefined,
								dateOfBirth: selectedDateOfBirth || undefined,
								address: selectedAddress || undefined,
								remark: selectedRemark || undefined,
								identityNo: selectedIdentityNumber.trim() || undefined,
								titleId: selectedTitleId ? Number(selectedTitleId) : undefined,
								genderId: selectedGenderId ? Number(selectedGenderId) : undefined,
								maritalStatusId: selectedMaritalStatusId
									? Number(selectedMaritalStatusId)
									: undefined,
								staffEmploymentTypeId: selectedStaffEmploymentTypeId
									? Number(selectedStaffEmploymentTypeId)
									: undefined,
								staffTypeId: selectedStaffTypeId
									? Number(selectedStaffTypeId)
									: undefined,
								countryId: selectedCountryId ? Number(selectedCountryId) : undefined,
								stateId: selectedStateId ? Number(selectedStateId) : undefined,
								cityId: selectedCityId ? Number(selectedCityId) : undefined,
								postalCodeId: selectedPostalCodeId
									? Number(selectedPostalCodeId)
									: undefined,
								nationalityId: selectedNationalityId
									? Number(selectedNationalityId)
									: undefined,
								identityTypeId: selectedIdentityTypeId
									? Number(selectedIdentityTypeId)
									: undefined,
								specializationId: selectedSpecializationId
									? Number(selectedSpecializationId)
									: undefined,
								joinDate: selectedJoinDate || undefined,
								resignDate: selectedResignDate || undefined,
								statusId: derivedStatusId
							},
							departmentId: selectedDepartmentId
								? Number(selectedDepartmentId)
								: null,
							userGroupIds: [...new Set(selectedUserGroups)],
							branchIds: [...new Set(selectedBranchIds.map(String))],
							staffDetail: {
								education: selectedEducation.trim() || undefined,
								designation: selectedDesignation.trim() || undefined,
								bloodTypeId: selectedBloodTypeId
									? Number(selectedBloodTypeId)
									: undefined,
								licenseNo: selectedLicenseNo.trim() || undefined,
								licenseExpiryDate: selectedLicenseExpiryDate || undefined,
								signatureText: selectedSignatureText.trim() || undefined
							}
						})
					}
				);

				if (photoFile) {
					photoUploading = true;
					try {
						const uploadFd = new FormData();
						uploadFd.set('photo', photoFile);
						const res = await fetch('/api/upload/staff-photo', {
							method: 'POST',
							body: uploadFd
						});
						const data = await res.json().catch(() => ({}));
						if (res.ok && data.url) {
							await getJson(
								staffRegistrationApiUrl(hid, { mode: 'update' }),
								{
									method: 'POST',
									headers: { 'content-type': 'application/json' },
									body: JSON.stringify({
										id: staffEditId,
										staff: { photoUrl: data.url }
									})
								}
							);
						}
					} finally {
						photoUploading = false;
					}
				} else if (removePhotoRequested) {
					await getJson(staffRegistrationApiUrl(hid, { mode: 'update' }), {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({
							id: staffEditId,
							staff: { photoUrl: null }
						})
					});
				}

				if (signatureFile) {
					const uploadFd = new FormData();
					uploadFd.set('signature', signatureFile);
					const res = await fetch('/api/upload/staff-signature', {
						method: 'POST',
						body: uploadFd
					});
					const data = await res.json().catch(() => ({}));
					if (res.ok && data.url) {
						await getJson(staffRegistrationApiUrl(hid, { mode: 'update' }), {
							method: 'POST',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({
								id: staffEditId,
								staff: {},
								staffDetail: { signatureImageUrl: data.url }
							})
						});
					}
				}

				if (shouldSendResetForEmailChange) {
					const { error } = await authClient.requestPasswordReset({
						email: trimmedNewEmail,
						redirectTo: routerUtil.getResetRedirectUrl()
					});
					if (error) {
						toastService.addToast(
							error.message ?? 'Failed to send reset password email.',
							StatusColorEnum.ERROR
						);
					} else {
						toastService.addToast(
							'Reset password email has been sent to the staff.',
							StatusColorEnum.INFO
						);
					}
				}

				toastService.addToast(
					toastLine(m.entity_staff(), m.toast_action_updated()),
					StatusColorEnum.SUCCESS
				);
				removePhotoRequested = false;
				return;
			}

			// 1. Create staff first (without photo/signature image URLs); assign to current hospital when in hospital context
			const urlHospitalId =
				typeof page.params.hospital_id === 'string' &&
				page.params.hospital_id
					? page.params.hospital_id
					: undefined;
			const trimmedEmailForCreate = selectedEmail.trim();
			const usingDefaultEmailForCreate = !trimmedEmailForCreate;
			const emailForCreate = trimmedEmailForCreate
				? trimmedEmailForCreate
				: `${crypto.randomUUID()}${StringUtil.NO_EMAIL_SUFFIX}`;
			if (!urlHospitalId) throw new Error('Hospital is required');

			const result = await getJson<{
				staff: { id: string; staffDetailId?: number | null };
				userId: string;
				generatedPassword: string;
			}>(staffRegistrationApiUrl(urlHospitalId, { mode: 'create' }), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					email: emailForCreate,
					name: fullName,
					code: selectedStaffCode.trim() || undefined,
					firstName: selectedFirstName.trim(),
					middleName: selectedMiddleName.trim() || undefined,
					lastName: selectedLastName.trim(),
					phonePrimary,
					phoneSecondary: phoneSecondary || undefined,
					phonePrimaryCountryId: selectedPhoneCountryId
						? Number(selectedPhoneCountryId)
						: undefined,
					phoneSecondaryCountryId: selectedPhoneSecondaryCountryId
						? Number(selectedPhoneSecondaryCountryId)
						: undefined,
					dateOfBirth: selectedDateOfBirth || undefined,
					joinDate: selectedJoinDate || undefined,
					resignDate: selectedResignDate || undefined,
					address: selectedAddress || undefined,
					remark: selectedRemark || undefined,
					identityNo: selectedIdentityNumber.trim() || undefined,
					titleId: selectedTitleId ? Number(selectedTitleId) : undefined,
					genderId: selectedGenderId ? Number(selectedGenderId) : undefined,
					maritalStatusId: selectedMaritalStatusId
						? Number(selectedMaritalStatusId)
						: undefined,
					staffEmploymentTypeId: selectedStaffEmploymentTypeId
						? Number(selectedStaffEmploymentTypeId)
						: undefined,
					staffTypeId: selectedStaffTypeId
						? Number(selectedStaffTypeId)
						: undefined,
					departmentId: selectedDepartmentId
						? Number(selectedDepartmentId)
						: undefined,
					specializationId: selectedSpecializationId
						? Number(selectedSpecializationId)
						: undefined,
					countryId: selectedCountryId ? Number(selectedCountryId) : undefined,
					stateId: selectedStateId ? Number(selectedStateId) : undefined,
					cityId: selectedCityId ? Number(selectedCityId) : undefined,
					postalCodeId: selectedPostalCodeId
						? Number(selectedPostalCodeId)
						: undefined,
					nationalityId: selectedNationalityId
						? Number(selectedNationalityId)
						: undefined,
					identityTypeId: selectedIdentityTypeId
						? Number(selectedIdentityTypeId)
						: undefined,
					statusId: derivedStatusId,
					userGroupIds: [...new Set(selectedUserGroups)],
					branchIds: [...new Set(selectedBranchIds.map(String))],
					staffDetail: {
						education: selectedEducation.trim() || undefined,
						designation: selectedDesignation.trim() || undefined,
						bloodTypeId: selectedBloodTypeId
							? Number(selectedBloodTypeId)
							: undefined,
						licenseNo: selectedLicenseNo.trim() || undefined,
						licenseExpiryDate: selectedLicenseExpiryDate || undefined,
						signatureText: selectedSignatureText.trim() || undefined
					}
				})
			});

			const staffId = result.staff.id;
			if (usingDefaultEmailForCreate) {
				await getJson(staffRegistrationApiUrl(urlHospitalId, { mode: 'update' }), {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						id: staffId,
						user: { id: result.userId, email: StringUtil.defaultNoEmail(staffId) },
						staff: {}
					})
				});
			}

			// 2. Upload profile photo and update staff
			if (photoFile) {
				photoUploading = true;
				try {
					const fd = new FormData();
					fd.set('photo', photoFile);
					const res = await fetch('/api/upload/staff-photo', {
						method: 'POST',
						body: fd
					});
					const data = await res.json().catch(() => ({}));
					if (!res.ok) {
						toastService.addToast(
							data.error ?? 'Photo upload failed.',
							StatusColorEnum.ERROR
						);
						return;
					}
					if (data.url) {
						await getJson(
							staffRegistrationApiUrl(urlHospitalId, { mode: 'update' }),
							{
								method: 'POST',
								headers: { 'content-type': 'application/json' },
								body: JSON.stringify({
									id: staffId,
									staff: { photoUrl: data.url }
								})
							}
						);
					}
				} finally {
					photoUploading = false;
				}
			}

			// 3. Upload signature image and update staff detail
			if (signatureFile) {
				const fd = new FormData();
				fd.set('signature', signatureFile);
				const res = await fetch('/api/upload/staff-signature', {
					method: 'POST',
					body: fd
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					toastService.addToast(
						data.error ?? 'Signature upload failed.',
						StatusColorEnum.ERROR
					);
					return;
				}
				if (data.url) {
					await getJson(
						staffRegistrationApiUrl(urlHospitalId, { mode: 'update' }),
						{
							method: 'POST',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({
								id: staffId,
								staff: {},
								staffDetail: { signatureImageUrl: data.url }
							})
						}
					);
				}
			}

			toastService.addToast(
				`Staff created successfully!`,
				StatusColorEnum.SUCCESS
			);

			if (selectedEmail?.trim()) {
				const { error } = await authClient.requestPasswordReset({
					email: selectedEmail.trim(),
					redirectTo: routerUtil.getResetRedirectUrl()
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
			}

			disableCreateSave = true;
		} catch (error: unknown) {
			let message: string | null = null;

			if (error && typeof error === 'object') {
				const err = error as {
					message?: string;
					body?: { message?: string };
				};

				// SvelteKit remote `command` wraps server errors in HttpError,
				// with the original message living at `error.body.message`.
				if (err.body && typeof err.body.message === 'string') {
					message = err.body.message;
				} else if (typeof err.message === 'string') {
					message = err.message;
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

	function resetStaffFormForNew() {
		disableCreateSave = false;
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
		selectedBranchIds = [];
		isActive = true;
		isSuperAdmin = false;
		isLocked = false;
		if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
		photoPreviewUrl = '';
		photoFile = null;
		removePhotoRequested = false;
		if (photoInputEl) photoInputEl.value = '';
		licenseAndSignatureModalOpen = false;
		selectedLicenseNo = '';
		selectedLicenseExpiryDate = '';
		signatureFile = null;
		selectedSignatureImageUrl = '';
		selectedSignatureText = '';
	}
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<form onsubmit={handleOnSubmit}>
			<fieldset
				disabled={isViewMode || (!isEditMode && disableCreateSave)}
				class="m-0 min-w-0 border-0 p-0"
			>
				<DaisyUiCardBodyTitle className="mb-5"
					>Profile Details</DaisyUiCardBodyTitle
				>
			</fieldset>
			<!-- Flex row: profile column (License & Signature button outside disabled fieldset) + form grid -->
			<div
				class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10"
			>
				<!-- Profile block: photo + Choose/Remove/Divider in fieldset; License & Signature button outside so it stays clickable in view mode -->
				<div
					class="flex shrink-0 flex-col items-center gap-4 sm:flex-row sm:items-start lg:flex-col lg:items-center"
				>
					<fieldset
						disabled={isViewMode ||
							(!isEditMode && disableCreateSave)}
						class="m-0 flex min-w-0 flex-col items-center gap-2 border-0 p-0"
					>
						<DaisyUiFileInput
							accept="image/jpeg,image/png,image/webp,image/gif"
							className="hidden"
							bind:inputEl={photoInputEl}
							onchange={handlePhotoChange}
						/>
						<button
							type="button"
							class="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-base-300 text-base-content/50 focus:ring-2 focus:ring-primary focus:outline-none sm:size-32 lg:size-36"
							onclick={() => photoInputEl?.click()}
							disabled={photoUploading}
							title="Choose photo (uploaded when you save)"
						>
							{#if photoUploading}
								<span class="text-xs">Uploading…</span>
							{:else if photoPreviewUrl}
								<img
									src={photoPreviewUrl}
									alt="Staff profile"
									class="size-full object-cover"
								/>
							{:else}
								<DaisyUiSkeleton className="size-full rounded-full" />
							{/if}
						</button>
						<div class="flex flex-col gap-2">
							<DaisyUiButton
								type="button"
								className="d-btn-primary d-btn-sm"
								onClick={() => photoInputEl?.click()}
								disabled={photoUploading}
							>
								{photoFile ? 'Change photo' : 'Choose photo'}
							</DaisyUiButton>
							<DaisyUiButton
								type="button"
								className="d-btn-error d-btn-sm"
								onClick={handleRemovePhoto}
								disabled={!photoFile && !photoPreviewUrl}
							>
								Remove
							</DaisyUiButton>
							<DaisyUiDivider
								position="horizontal"
								className="text-xs">More Detail</DaisyUiDivider
							>
						</div>
					</fieldset>
					<div class="flex flex-col gap-2">
						<DaisyUiButton
							type="button"
							className="d-btn-outline d-btn-sm"
							onClick={showLicenseAndSignatureModal}
						>
							License &amp; Signature
						</DaisyUiButton>
					</div>
				</div>

				<!-- Form columns: 1 col mobile, 2 md, 3 xl -->
				<fieldset
					disabled={isViewMode || (!isEditMode && disableCreateSave)}
					class="m-0 min-w-0 flex-1 border-0 p-0"
				>
					<div
						class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
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
						<LStaffRegistrationSecondColumn
							{countryData}
							{bloodTypeData}
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
							bind:selectedBloodTypeId
						/>

						<!-- Column 3 -->
						<LStaffRegistrationThirdColumn
							{countryData}
							{stateData}
							{cityData}
							{nationalityData}
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
							bind:selectedNationalityId
						/>
					</div>
				</fieldset>
			</div>

			<fieldset
				disabled={isViewMode || (!isEditMode && disableCreateSave)}
				class="m-0 min-w-0 border-0 p-0"
			>
				<!-- More Info: 1 col mobile, 2 cols md+ -->
				<LStaffRegistrationMoreInfo
					bind:selectedAddress
					bind:selectedRemark
				/>

				<!-- Permissions: stack on mobile, row on md+ -->
				<LStaffRegistrationPermissions
					{userGroupData}
					{branchData}
					bind:selectedUserGroups
					bind:selectedBranchIds
					bind:selectedJoinDate
					bind:selectedResignDate
					bind:isActive
					bind:isSuperAdmin
					bind:isLocked
				/>
			</fieldset>

			<!-- Submit: update when saving edits to an existing staff record; create when registering new -->
			{#if !isViewMode}
				<DaisyUiCardBodyAction className="mt-6 flex flex-wrap gap-3">
					<DaisyUiButton
						type="submit"
						className="d-btn-wide {isEditMode
							? 'd-btn-accent'
							: 'd-btn-primary'}"
						loading={isLoading}
						disabled={!isEditMode && disableCreateSave}
					>
						{isEditMode ? m.update() : m.create()}
					</DaisyUiButton>
					{#if !isEditMode && disableCreateSave}
						<DaisyUiButton
							type="button"
							className="d-btn-outline d-btn-wide"
							onClick={resetStaffFormForNew}
							disabled={isLoading}
						>
							New
						</DaisyUiButton>
					{/if}
				</DaisyUiCardBodyAction>
			{/if}
			<LStaffRegistrationLicenseAndSignatureModal
				bind:open={licenseAndSignatureModalOpen}
				bind:licenseNo={selectedLicenseNo}
				bind:licenseExpiryDate={selectedLicenseExpiryDate}
				bind:signatureFile
				bind:signatureText={selectedSignatureText}
				initialSignatureImageUrl={selectedSignatureImageUrl}
				viewOnly={isViewMode}
			/>
		</form>
	</DaisyUiCardBody>
</DaisyUiCard>
