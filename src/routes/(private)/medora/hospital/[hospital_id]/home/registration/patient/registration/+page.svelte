<script lang="ts">
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashCardBodyAction from '$lib/component/wash/card/body/action/WashCardBodyAction.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDivider from '$lib/component/wash/divider/WashDivider.svelte';
	import LPatientRegistrationFirstColumn from '$lib/component/own/local/private/medora/patient/registration/LPatientRegistrationFirstColumn.svelte';
	import LPatientRegistrationSecondColumn from '$lib/component/own/local/private/medora/patient/registration/LPatientRegistrationSecondColumn.svelte';
	import LPatientRegistrationThirdColumn from '$lib/component/own/local/private/medora/patient/registration/LPatientRegistrationThirdColumn.svelte';
	import LPatientRegistrationMoreInfo from '$lib/component/own/local/private/medora/patient/registration/LPatientRegistrationMoreInfo.svelte';
	import LPatientRegistrationStatus from '$lib/component/own/local/private/medora/patient/registration/LPatientRegistrationStatus.svelte';

	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { browser } from '$app/environment';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum, YesNoEnum } from '$lib/model/enum/db-link';

	import type {
		PatientRegBloodTypeRow,
		PatientRegCityRow,
		PatientRegCountryRow,
		PatientRegGenderRow,
		PatientRegIdentityTypeRow,
		PatientRegMaritalStatusRow,
		PatientRegNationalityRow,
		PatientRegPostalCodeRow,
		PatientRegReligionRow,
		PatientRegStateRow,
		PatientRegTitleRow
	} from '$lib/model/type/medora/patient-reg-master.type';

	import { authClient } from '$lib/auth/client';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { getPatientPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import WashFileInput from '$lib/component/wash/fileinput/WashFileInput.svelte';
	import { page } from '$app/state';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import LPatientAttachmentDialogContent from '$lib/component/own/local/private/medora/patient/attachment/LPatientAttachmentDialogContent.svelte';
	import { PatientAttachmentDialogState } from '$lib/state/patient-attachment.dialog.state.svelte';
	import { PatientDuplicateModalState } from '$lib/state/patient-duplicate-modal.state.svelte';
	import LPatientCheckDuplicateDialogContent from '$lib/component/own/local/private/medora/patient/registration/LPatientCheckDuplicateDialogContent.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import LPatientCardPrintModal from '$lib/component/own/local/private/medora/patient/list/LPatientCardPrintModal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const lifeCycleUtil = new LifeCycleUtil();
	const dateTimeUtil = new DateTimeUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	const viewId = $derived(page.url.searchParams.get('view'));
	const editId = $derived(page.url.searchParams.get('edit'));
	const currentPatientId = $derived(viewId || editId);
	const isViewMode = $derived(!!viewId);
	const stagedAttachmentCount = $derived(
		PatientAttachmentDialogState.stagedAttachments.length
	);

	let patientCardDialog = $state<{
		patientId: string;
	} | null>(null);

	function openPatientCardDialog(id: string) {
		patientCardDialog = { patientId: id };
	}

	function closePatientCardDialog() {
		patientCardDialog = null;
	}

	// Lookup data
	let titleData: PatientRegTitleRow[] = $state([]);
	let genderData: PatientRegGenderRow[] = $state([]);
	let maritalStatusData: PatientRegMaritalStatusRow[] = $state([]);
	let identityTypeData: PatientRegIdentityTypeRow[] = $state([]);
	let bloodTypeData: PatientRegBloodTypeRow[] = $state([]);
	let countryData: PatientRegCountryRow[] = $state([]);
	let stateData: PatientRegStateRow[] = $state([]);
	let cityData: PatientRegCityRow[] = $state([]);
	let postalCodeData: PatientRegPostalCodeRow[] = $state([]);
	let nationalityData: PatientRegNationalityRow[] = $state([]);
	let religionData: PatientRegReligionRow[] = $state([]);

	// Form state
	let patientCode: string = $state('');
	const hospitalIdFromUrl = $derived(
		(typeof page.params?.hospital_id === 'string' &&
			page.params.hospital_id) ||
			''
	);

	function registrationPatientApiBase(): string {
		const h = hospitalIdFromUrl;
		return h
			? `/api/medora/hospital/${h}/home/registration/patient/registration`
			: '';
	}

	function nursingPatientAttachmentApiBase(): string {
		const h = hospitalIdFromUrl;
		return h
			? `/api/medora/hospital/${h}/home/nursing-workbench/emr/patient-attachment`
			: '';
	}

	async function fetchMasterLookup<T>(kind: string): Promise<T[]> {
		const r = await fetch(`/api/medora/master/lookup?kind=${kind}`);
		if (!r.ok) {
			throw new Error((await r.text()) || 'Lookup failed');
		}
		return r.json();
	}

	async function apiGetPatientByIdForForm(
		id: string
	): Promise<any | null> {
		const base = registrationPatientApiBase();
		if (!base) return null;
		const r = await fetch(`${base}?id=${encodeURIComponent(id)}`);
		if (!r.ok) {
			throw new Error((await r.text()) || 'Failed to load patient');
		}
		return (await r.json()) as any | null;
	}

	async function apiUpdateUserJson(body: {
		id: string;
		name?: string;
		email?: string;
	}) {
		// NOTE: Patient registration should not call `/api/medora/auth/user` because
		// that endpoint blocks non-self updates (403). Linked patient user updates
		// are handled via the patient registration API endpoint instead.
		void body;
		throw new Error(
			'User update is handled by patient registration endpoint'
		);
	}

	async function apiUpdatePatient(body: Record<string, unknown>) {
		const base = registrationPatientApiBase();
		if (!base) throw new Error('Missing hospital context');
		const r = await fetch(base, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!r.ok) {
			throw new Error((await r.text()) || 'Patient update failed');
		}
		return r.json();
	}

	async function apiCreatePatientWithUser(
		body: Record<string, unknown>
	) {
		const base = registrationPatientApiBase();
		if (!base) throw new Error('Missing hospital context');
		const r = await fetch(base, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mode: 'create', ...body })
		});
		if (!r.ok) {
			throw new Error((await r.text()) || 'Create patient failed');
		}
		return r.json() as Promise<{
			patient: { id: string; code?: string | null };
			userId: string;
			generatedPassword: string;
		}>;
	}

	async function apiGetDuplicatePatients(
		payload: Record<string, unknown>
	) {
		const base = registrationPatientApiBase();
		if (!base) throw new Error('Missing hospital context');
		const r = await fetch(base, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mode: 'duplicates', ...payload })
		});
		if (!r.ok) {
			throw new Error((await r.text()) || 'Duplicate check failed');
		}
		const j = (await r.json()) as { data: unknown[] };
		return j.data;
	}

	async function apiCreatePatientAttachment(body: {
		patientId: string;
		fileUrl: string;
		description?: string;
	}) {
		const base = nursingPatientAttachmentApiBase();
		if (!base) throw new Error('Missing hospital context');
		const r = await fetch(base, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!r.ok) {
			throw new Error((await r.text()) || 'Attachment save failed');
		}
		return r.json();
	}
	let selectedTitleId: string = $state('');
	let firstName: string = $state('');
	let middleName: string = $state('');
	let lastName: string = $state('');
	let email: string = $state('');
	let identityNo: string = $state('');
	let dateOfBirth: string = $state('');
	let fatherName: string = $state('');
	let guardianName: string = $state('');
	let guardianPhone: string = $state('');
	let address: string = $state('');
	let remark: string = $state('');

	let selectedPhoneCountryId: string = $state('');
	let selectedPhone: string = $state('');
	let selectedPhoneSecondaryCountryId: string = $state('');
	let selectedPhoneSecondary: string = $state('');
	let selectedFatherTitleId: string = $state('');
	let selectedGuardianPhoneCountryId: string = $state('');
	let selectedGuardianTitleId: string = $state('');
	let selectedGenderId: string = $state('');
	let selectedMaritalStatusId: string = $state('');
	let selectedIdentityTypeId: string = $state('');
	let selectedBloodTypeId: string = $state('');
	let selectedCountryId: string = $state('');
	let selectedStateId: string = $state('');
	let selectedCityId: string = $state('');
	let selectedPostalCodeId: string = $state('');
	let selectedNationalityId: string = $state('');
	let selectedReligionId: string = $state('');

	// Derived: selected objects and filtered lists (staff-style cascading)
	let selectedCountry = $derived(
		countryData.find((c) => String(c.id) === selectedCountryId) ??
			({} as PatientRegCountryRow)
	);
	let selectedState = $derived(
		stateData.find((s) => String(s.id) === selectedStateId) ??
			({} as PatientRegStateRow)
	);
	let selectedCity = $derived(
		cityData.find((c) => String(c.id) === selectedCityId) ??
			({} as PatientRegCityRow)
	);
	let selectedPostalCode = $derived(
		postalCodeData.find(
			(p) => String(p.id) === selectedPostalCodeId
		) ?? ({} as PatientRegPostalCodeRow)
	);
	let filteredStateData = $derived(
		selectedCountry?.id
			? stateData.filter((s) => s.countryId === selectedCountry.id)
			: []
	);
	let filteredCityData = $derived(
		selectedState?.id
			? cityData.filter((c) => c.stateId === selectedState.id)
			: []
	);
	let filteredPostalCodeData = $derived(
		selectedCity?.id
			? postalCodeData.filter((p) => p.cityId === selectedCity.id)
			: []
	);

	// Reset dependent location fields when parent changes (staff-style)
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

	let isActive: boolean = $state(true);
	let nameMasking: boolean = $state(false);
	let isLoading: boolean = $state(false);
	// After creating a new patient, hide the Save button until user clicks New
	let disableCreateSave: boolean = $state(false);

	let photoFile: File | null = $state(null);
	let photoPreviewUrl: string = $state('');
	let photoUploading: boolean = $state(false);
	let removePhotoRequested: boolean = $state(false);
	let photoInputEl: HTMLInputElement | undefined = $state();

	let duplicateCheckLoading = $state(false);

	async function fetchLookups() {
		[
			titleData,
			genderData,
			maritalStatusData,
			identityTypeData,
			bloodTypeData,
			countryData,
			stateData,
			cityData,
			postalCodeData,
			nationalityData,
			religionData
		] = await Promise.all([
			fetchMasterLookup<PatientRegTitleRow>('title'),
			fetchMasterLookup<PatientRegGenderRow>('gender'),
			fetchMasterLookup<PatientRegMaritalStatusRow>('maritalStatus'),
			fetchMasterLookup<PatientRegIdentityTypeRow>('identityType'),
			fetchMasterLookup<PatientRegBloodTypeRow>('bloodType'),
			fetchMasterLookup<PatientRegCountryRow>('country'),
			fetchMasterLookup<PatientRegStateRow>('state'),
			fetchMasterLookup<PatientRegCityRow>('city'),
			fetchMasterLookup<PatientRegPostalCodeRow>('postalCode'),
			fetchMasterLookup<PatientRegNationalityRow>('nationality'),
			fetchMasterLookup<PatientRegReligionRow>('religion')
		]);
	}

	async function loadPatientIntoForm(id: string) {
		const patient = await apiGetPatientByIdForForm(id);
		if (!patient) return;
		patientCode = patient.code ?? '';
		selectedTitleId =
			patient.titleId != null ? String(patient.titleId) : '';
		firstName = patient.firstName ?? '';
		middleName = patient.middleName ?? '';
		lastName = patient.lastName ?? '';
		email = StringUtil.displayEmail(
			(patient as { user?: { email?: string | null } }).user?.email ??
				''
		);
		selectedGenderId =
			patient.genderId != null ? String(patient.genderId) : '';
		selectedMaritalStatusId =
			patient.maritalStatusId != null
				? String(patient.maritalStatusId)
				: '';
		identityNo = patient.identityNo ?? '';
		dateOfBirth = patient.dateOfBirth
			? typeof patient.dateOfBirth === 'string'
				? patient.dateOfBirth
				: new Date(patient.dateOfBirth).toISOString().slice(0, 10)
			: '';
		selectedFatherTitleId =
			patient.fatherTitleId != null
				? String(patient.fatherTitleId)
				: '';
		fatherName =
			(patient as { fatherName?: string }).fatherName ?? '';
		selectedGuardianTitleId =
			patient.guardianTitleId != null
				? String(patient.guardianTitleId)
				: '';
		guardianName = patient.guardianName ?? '';
		const guardianPhoneRaw = patient.guardianPhone ?? '';
		const guardianPhoneCountryId = (
			patient as { guardianPhoneCountryId?: number | null }
		).guardianPhoneCountryId;
		selectedGuardianPhoneCountryId =
			guardianPhoneCountryId != null
				? String(guardianPhoneCountryId)
				: '';
		if (guardianPhoneCountryId != null) {
			const country = countryData.find(
				(c) => c.id === guardianPhoneCountryId
			);
			guardianPhone =
				country?.countryCallingCode &&
				guardianPhoneRaw.startsWith(country.countryCallingCode)
					? guardianPhoneRaw
							.slice(country.countryCallingCode.length)
							.trim()
					: guardianPhoneRaw;
		} else {
			guardianPhone = guardianPhoneRaw;
		}
		address = patient.address ?? '';
		remark = patient.remark ?? '';
		selectedReligionId =
			patient.religionId != null ? String(patient.religionId) : '';
		selectedIdentityTypeId =
			patient.identityTypeId != null
				? String(patient.identityTypeId)
				: '';
		selectedBloodTypeId =
			patient.bloodTypeId != null ? String(patient.bloodTypeId) : '';
		selectedCountryId =
			patient.countryId != null ? String(patient.countryId) : '';
		selectedStateId =
			patient.stateId != null ? String(patient.stateId) : '';
		selectedCityId =
			patient.cityId != null ? String(patient.cityId) : '';
		selectedPostalCodeId =
			patient.postalCodeId != null
				? String(patient.postalCodeId)
				: '';
		selectedNationalityId =
			patient.nationalityId != null
				? String(patient.nationalityId)
				: '';
		isActive = patient.statusId === StatusEnum.ACTIVE;
		nameMasking =
			(patient as { nameMasking?: number }).nameMasking ===
			YesNoEnum.YES;

		const phonePrimary = patient.phonePrimary ?? '';
		const phoneSecondary = patient.phoneSecondary ?? '';
		const patientPrimaryCountryId = (
			patient as { phonePrimaryCountryId?: number | null }
		).phonePrimaryCountryId;
		const patientSecondaryCountryId = (
			patient as { phoneSecondaryCountryId?: number | null }
		).phoneSecondaryCountryId;
		if (patientPrimaryCountryId != null) {
			selectedPhoneCountryId = String(patientPrimaryCountryId);
			const country = countryData.find(
				(c) => c.id === patientPrimaryCountryId
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
		if (patientSecondaryCountryId != null) {
			selectedPhoneSecondaryCountryId = String(
				patientSecondaryCountryId
			);
			const country = countryData.find(
				(c) => c.id === patientSecondaryCountryId
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

		photoPreviewUrl =
			getPatientPhotoDisplayUrl(
				(patient as { photoPath?: string }).photoPath
			) ??
			(patient as { photoPath?: string }).photoPath ??
			'';
		removePhotoRequested = false;
	}

	let lastLoadedPatientId: string | null = $state(null);

	async function fetchInitialFieldData() {
		await fetchLookups();
		const id = viewId || editId;
		if (id && typeof id === 'string') {
			lastLoadedPatientId = id;
			await loadPatientIntoForm(id);
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchInitialFieldData();
	});

	$effect(() => {
		const id = viewId || editId;
		if (!id || typeof id !== 'string') {
			lastLoadedPatientId = null;
			return;
		}
		if (titleData.length === 0) return;
		if (lastLoadedPatientId === id) return;
		lastLoadedPatientId = id;
		loadPatientIntoForm(id);
	});

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

	function buildPhonePrimary(): string {
		if (!selectedPhoneCountryId || !selectedPhone?.trim())
			return selectedPhone?.trim() ?? '';
		// Store only local number in `phonePrimary`; country calling code is represented by `phonePrimaryCountryId`.
		return selectedPhone.trim();
	}

	async function checkDuplicate() {
		const phonePrimary = buildPhonePrimary();
		if (!firstName?.trim()) {
			toastService.addToast(
				'Enter at least first name to check for duplicates.',
				StatusColorEnum.ERROR
			);
			return;
		}
		duplicateCheckLoading = true;
		try {
			const list = await apiGetDuplicatePatients({
				titleId: selectedTitleId ? Number(selectedTitleId) : null,
				firstName: firstName.trim(),
				middleName: middleName.trim(),
				lastName: lastName.trim(),
				fatherTitleId: selectedFatherTitleId
					? Number(selectedFatherTitleId)
					: null,
				fatherName: fatherName.trim(),
				phonePrimary,
				identityTypeId: selectedIdentityTypeId
					? Number(selectedIdentityTypeId)
					: null,
				identityNo: identityNo.trim(),
				excludePatientId: currentPatientId ?? undefined
			});
			if (list.length === 0) {
				toastService.addToast(
					'No duplicate patients found.',
					StatusColorEnum.SUCCESS
				);
			} else {
				PatientDuplicateModalState.duplicates = list as any;
				const result = await dialogService.open({
					title: 'Duplicate patients found',
					fullScreen: true,
					component: LPatientCheckDuplicateDialogContent
				});
				if (result.confirmed && result.data) {
					handleSelectDuplicatePatient(result.data as any);
				}
				PatientDuplicateModalState.duplicates = [];
			}
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to check for duplicates.',
				StatusColorEnum.ERROR
			);
		} finally {
			duplicateCheckLoading = false;
		}
	}

	function handleSelectDuplicatePatient(patient: any) {
		routerUtil.replaceRoute(
			`${page.url.pathname}?edit=${patient.id}`
		);
	}

	async function goToPatientAttachment() {
		PatientAttachmentDialogState.viewOnly = isViewMode;

		if (currentPatientId) {
			PatientAttachmentDialogState.stagedAttachments = [];
			PatientAttachmentDialogState.pending = {
				patientId: currentPatientId,
				hospitalId: hospitalIdFromUrl
			};
		} else {
			// New patient: stage attachments; they will be saved when registration is submitted
			PatientAttachmentDialogState.pending = { mode: 'staging' };
		}

		await dialogService.open({
			title: 'Patient attachments',
			fullScreen: true,
			component: LPatientAttachmentDialogContent
		});

		PatientAttachmentDialogState.pending = null;
		PatientAttachmentDialogState.viewOnly = false;
	}

	async function handleOnSubmit(e: SubmitEvent) {
		e.preventDefault();

		// Basic validation
		if (!firstName.trim()) {
			toastService.addToast(
				'First name is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		// Email is now optional; no validation here.

		const fullName =
			[firstName, middleName, lastName].filter(Boolean).join(' ') ||
			firstName;

		// Store only local number; country calling code lives in *_CountryId columns.
		let phonePrimary: string | undefined;
		if (selectedPhoneCountryId && selectedPhone) {
			phonePrimary = selectedPhone.trim();
		}
		let phoneSecondary: string | undefined;
		if (selectedPhoneSecondaryCountryId && selectedPhoneSecondary) {
			phoneSecondary = selectedPhoneSecondary.trim();
		}
		const guardianPhoneValue = guardianPhone.trim();
		let guardianPhoneComputed: string | undefined;
		if (selectedGuardianPhoneCountryId && guardianPhoneValue) {
			guardianPhoneComputed = guardianPhoneValue;
		} else if (guardianPhoneValue) {
			guardianPhoneComputed = guardianPhoneValue;
		}

		// Client-only submission handler (uses FormData, fetch, etc.)
		if (!browser) {
			return;
		}

		if (!currentPatientId && !hospitalIdFromUrl) {
			toastService.addToast(
				'Hospital context is missing from URL.',
				StatusColorEnum.ERROR
			);
			return;
		}

		isLoading = true;
		try {
			if (currentPatientId) {
				// Edit: update existing patient
				const previous =
					await apiGetPatientByIdForForm(currentPatientId);
				if (!previous) {
					toastService.addToast(
						'Patient not found.',
						StatusColorEnum.ERROR
					);
					return;
				}
				const previousUser = previous as {
					user?: {
						id?: string;
						email?: string | null;
						name?: string | null;
					};
				};
				const previousEmail = previousUser.user?.email ?? '';
				const previousName = previousUser.user?.name ?? '';
				const trimmedNewName = fullName.trim();
				const trimmedNewEmail = email.trim();
				let shouldSendResetForEmailChange = false;
				let resetEmailTarget: string | null = null;
				const userNameUpdate =
					trimmedNewName && trimmedNewName !== previousName
						? trimmedNewName
						: undefined;
				if (trimmedNewEmail && trimmedNewEmail !== previousEmail) {
					if (StringUtil.isNoEmail(previousEmail)) {
						shouldSendResetForEmailChange = true;
						resetEmailTarget = trimmedNewEmail;
					}
				}
				const userEmailUpdate =
					trimmedNewEmail && trimmedNewEmail !== previousEmail
						? trimmedNewEmail
						: undefined;

				await apiUpdatePatient({
					id: currentPatientId,
					userName: userNameUpdate,
					userEmail: userEmailUpdate,
					code: patientCode.trim() || undefined,
					titleId: selectedTitleId
						? Number(selectedTitleId)
						: undefined,
					firstName: firstName.trim(),
					middleName: middleName.trim() || undefined,
					lastName: lastName.trim() || undefined,
					phonePrimary,
					phoneSecondary,
					phonePrimaryCountryId: selectedPhoneCountryId
						? Number(selectedPhoneCountryId)
						: undefined,
					phoneSecondaryCountryId: selectedPhoneSecondaryCountryId
						? Number(selectedPhoneSecondaryCountryId)
						: undefined,
					fatherTitleId: selectedFatherTitleId
						? Number(selectedFatherTitleId)
						: undefined,
					fatherName: fatherName.trim() || undefined,
					guardianTitleId: selectedGuardianTitleId
						? Number(selectedGuardianTitleId)
						: undefined,
					identityNo: identityNo.trim() || undefined,
					dateOfBirth: dateOfBirth || undefined,
					guardianName: guardianName.trim() || undefined,
					guardianPhone: guardianPhoneComputed,
					guardianPhoneCountryId: selectedGuardianPhoneCountryId
						? Number(selectedGuardianPhoneCountryId)
						: undefined,
					address: address.trim() || undefined,
					remark: remark.trim() || undefined,
					maritalStatusId: selectedMaritalStatusId
						? Number(selectedMaritalStatusId)
						: undefined,
					genderId: selectedGenderId
						? Number(selectedGenderId)
						: undefined,
					identityTypeId: selectedIdentityTypeId
						? Number(selectedIdentityTypeId)
						: undefined,
					bloodTypeId: selectedBloodTypeId
						? Number(selectedBloodTypeId)
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
					nationalityId: selectedNationalityId
						? Number(selectedNationalityId)
						: undefined,
					religionId: selectedReligionId
						? Number(selectedReligionId)
						: undefined,
					statusId: isActive
						? StatusEnum.ACTIVE
						: StatusEnum.INACTIVE,
					nameMasking: nameMasking ? YesNoEnum.YES : YesNoEnum.NO
				});

				if (photoFile) {
					photoUploading = true;
					try {
						const fd = new FormData();
						fd.set('photo', photoFile);
						const res = await fetch('/api/upload/patient-photo', {
							method: 'POST',
							body: fd
						});
						const data = await res.json().catch(() => ({}));
						if (!res.ok) {
							toastService.addToast(
								data.error ?? 'Photo upload failed.',
								StatusColorEnum.ERROR
							);
						} else if (data.url) {
							await apiUpdatePatient({
								id: currentPatientId,
								photoPath: data.url
							});
							photoPreviewUrl =
								getPatientPhotoDisplayUrl(data.url) ?? data.url ?? '';
						}
					} finally {
						photoUploading = false;
					}
				} else if (removePhotoRequested) {
					await apiUpdatePatient({
						id: currentPatientId,
						photoPath: null
					});
				}

				toastSuccess(
					toastService,
					m.entity_patient(),
					m.toast_action_updated()
				);
				removePhotoRequested = false;

				if (shouldSendResetForEmailChange && resetEmailTarget) {
					const { error } = await authClient.requestPasswordReset({
						email: resetEmailTarget,
						redirectTo: routerUtil.getResetRedirectUrl()
					});
					if (error) {
						toastService.addToast(
							error.message ?? 'Failed to send reset password email.',
							StatusColorEnum.ERROR
						);
					} else {
						toastService.addToast(
							'Reset password email has been sent to the patient.',
							StatusColorEnum.INFO
						);
					}
				}
			} else {
				// Create: new patient (code is generated on backend from route hospital).
				// Email is optional, but account creation still requires a unique email, so we
				// pass whatever is provided (or a generated placeholder if blank).
				const emailValue = email.trim();
				const usingDefaultEmailForCreate = !emailValue;
				const result = await apiCreatePatientWithUser({
					email:
						emailValue ||
						`${crypto.randomUUID()}${StringUtil.NO_EMAIL_SUFFIX}`,
					name: fullName,
					hospitalId: hospitalIdFromUrl ?? '',
					titleId: selectedTitleId
						? Number(selectedTitleId)
						: undefined,
					firstName: firstName.trim(),
					middleName: middleName.trim() || undefined,
					lastName: lastName.trim() || undefined,
					phonePrimary,
					phoneSecondary,
					phonePrimaryCountryId: selectedPhoneCountryId
						? Number(selectedPhoneCountryId)
						: undefined,
					phoneSecondaryCountryId: selectedPhoneSecondaryCountryId
						? Number(selectedPhoneSecondaryCountryId)
						: undefined,
					identityNo: identityNo.trim() || undefined,
					dateOfBirth: dateOfBirth || undefined,
					fatherTitleId: selectedFatherTitleId
						? Number(selectedFatherTitleId)
						: undefined,
					fatherName: fatherName.trim() || undefined,
					guardianTitleId: selectedGuardianTitleId
						? Number(selectedGuardianTitleId)
						: undefined,
					guardianName: guardianName.trim() || undefined,
					guardianPhone: guardianPhoneComputed,
					guardianPhoneCountryId: selectedGuardianPhoneCountryId
						? Number(selectedGuardianPhoneCountryId)
						: undefined,
					address: address.trim() || undefined,
					remark: remark.trim() || undefined,
					religionId: selectedReligionId
						? Number(selectedReligionId)
						: undefined,
					maritalStatusId: selectedMaritalStatusId
						? Number(selectedMaritalStatusId)
						: undefined,
					genderId: selectedGenderId
						? Number(selectedGenderId)
						: undefined,
					identityTypeId: selectedIdentityTypeId
						? Number(selectedIdentityTypeId)
						: undefined,
					bloodTypeId: selectedBloodTypeId
						? Number(selectedBloodTypeId)
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
					nationalityId: selectedNationalityId
						? Number(selectedNationalityId)
						: undefined,
					isActive,
					nameMasking
				});

				const { patient } = result;
				patientCode = patient.code ?? '';
				// For create: server normalizes placeholder no-email to patientId@no-email.medora.

				if (photoFile) {
					photoUploading = true;
					try {
						const fd = new FormData();
						fd.set('photo', photoFile);
						const res = await fetch('/api/upload/patient-photo', {
							method: 'POST',
							body: fd
						});
						const data = await res.json().catch(() => ({}));
						if (!res.ok) {
							toastService.addToast(
								data.error ?? 'Photo upload failed.',
								StatusColorEnum.ERROR
							);
						} else if (data.url) {
							await apiUpdatePatient({
								id: patient.id,
								photoPath: data.url
							});
							photoPreviewUrl =
								getPatientPhotoDisplayUrl(data.url) ?? data.url ?? '';
						}
					} finally {
						photoUploading = false;
					}
				}

				const staged = PatientAttachmentDialogState.stagedAttachments;
				let attachmentFailCount = 0;
				for (const item of staged) {
					const fd = new FormData();
					fd.set('file', item.file);
					const res = await fetch('/api/upload/patient-attachment', {
						method: 'POST',
						body: fd
					});
					const data = await res.json().catch(() => ({}));
					if (res.ok && data.url) {
						try {
							await apiCreatePatientAttachment({
								patientId: patient.id,
								fileUrl: data.url,
								description: item.description.trim() || undefined
							});
						} catch {
							attachmentFailCount += 1;
							toastService.addToast(
								`Failed to save attachment="${item.file.name}".`,
								StatusColorEnum.ERROR
							);
						}
					} else {
						attachmentFailCount += 1;
						toastService.addToast(
							data?.error ?? `Upload failed for ${item.file.name}.`,
							StatusColorEnum.ERROR
						);
					}
				}
				PatientAttachmentDialogState.stagedAttachments = [];
				if (attachmentFailCount > 0) {
					toastService.addToast(
						`Patient created but ${attachmentFailCount} attachment(s) failed to upload.`,
						StatusColorEnum.WARNING
					);
				}

				toastSuccess(
					toastService,
					m.entity_patient(),
					m.toast_action_created(),
					patientCode
				);

				if (emailValue) {
					const { error } = await authClient.requestPasswordReset({
						email: emailValue,
						redirectTo: routerUtil.getResetRedirectUrl()
					});
					if (error) {
						toastService.addToast(
							error.message ?? 'Failed to send reset link.',
							StatusColorEnum.ERROR
						);
					} else {
						toastService.addToast(
							'Reset password email has been sent to the patient.',
							StatusColorEnum.INFO
						);
					}
				}
				disableCreateSave = true;
			}
		} catch (error: unknown) {
			let message: string | null = null;

			if (error && typeof error === 'object') {
				const err = error as {
					message?: string;
					body?: { message?: string };
				};
				if (err.body && typeof err.body.message === 'string') {
					message = err.body.message;
				} else if (typeof err.message === 'string') {
					message = err.message;
				}
			}

			if (!message) {
				message = currentPatientId
					? 'Failed to update patient. Please try again.'
					: 'Failed to create patient. Please try again.';
			}

			toastService.addToast(message, StatusColorEnum.ERROR);
		} finally {
			isLoading = false;
		}
	}

	function resetPatientFormForNew() {
		disableCreateSave = false;
		patientCode = '';
		selectedTitleId = '';
		firstName = '';
		middleName = '';
		lastName = '';
		email = '';
		selectedPhoneCountryId = '';
		selectedPhone = '';
		selectedPhoneSecondaryCountryId = '';
		selectedPhoneSecondary = '';
		selectedFatherTitleId = '';
		selectedGuardianTitleId = '';
		selectedGuardianPhoneCountryId = '';
		identityNo = '';
		dateOfBirth = '';
		guardianName = '';
		guardianPhone = '';
		address = '';
		remark = '';
		selectedReligionId = '';
		selectedGenderId = '';
		selectedMaritalStatusId = '';
		selectedIdentityTypeId = '';
		selectedBloodTypeId = '';
		selectedCountryId = '';
		selectedStateId = '';
		selectedCityId = '';
		selectedPostalCodeId = '';
		selectedNationalityId = '';
		isActive = true;
		nameMasking = false;
		if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
		photoPreviewUrl = '';
		photoFile = null;
		removePhotoRequested = false;
		if (photoInputEl) photoInputEl.value = '';
		PatientAttachmentDialogState.stagedAttachments = [];
	}
</script>

<WashCard>
	<WashCardBody>
		<form onsubmit={handleOnSubmit}>
			<fieldset
				disabled={isViewMode || disableCreateSave}
				class="m-0 min-w-0 border-0 p-0"
			>
				<WashCardBodyTitle className="mb-5">
					Profile Details
				</WashCardBodyTitle>
			</fieldset>
			<!-- Flex row: profile column (Attachments button outside disabled fieldset) + form grid -->
			<div
				class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10"
			>
				<!-- Profile block: photo + Choose/Remove/Divider in fieldset; Attachments button outside so it stays clickable in view mode -->
				<div
					class="flex shrink-0 flex-col items-center gap-4 sm:flex-row sm:items-start lg:flex-col lg:items-center"
				>
					<fieldset
						disabled={isViewMode || disableCreateSave}
						class="m-0 flex min-w-0 flex-col items-center gap-2 border-0 p-0"
					>
						<WashFileInput
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
									alt="Patient profile"
									class="size-full object-cover"
								/>
							{:else}
								<div class="skeleton size-full rounded-full"></div>
							{/if}
						</button>
						<div class="flex flex-col gap-2">
							<WashButton
								type="button"
								className="btn-primary btn-sm"
								onClick={() => photoInputEl?.click()}
								disabled={photoUploading}
							>
								{photoFile ? 'Change photo' : 'Choose photo'}
							</WashButton>
							<WashButton
								type="button"
								className="btn-error btn-sm"
								onClick={handleRemovePhoto}
								disabled={!photoFile && !photoPreviewUrl}
							>
								Remove
							</WashButton>
							<WashDivider className="text-xs">More Detail</WashDivider>
						</div>
					</fieldset>
					<div class="flex flex-col gap-2">
						<WashButton
							type="button"
							className="btn-outline btn-sm"
							onClick={goToPatientAttachment}
						>
							Attachments
							{#if !currentPatientId && stagedAttachmentCount > 0}
								({stagedAttachmentCount})
							{/if}
						</WashButton>

						<WashButton
							type="button"
							className="btn-ghost btn-sm gap-2"
							disabled={!currentPatientId}
							onClick={() =>
								currentPatientId &&
								openPatientCardDialog(currentPatientId)}
						>
							<LucidePrinter className="size-5" />
							Card
						</WashButton>
					</div>
				</div>

				<!-- Form columns: 1 col mobile, 2 md, 3 xl (same as staff) -->
				<fieldset
					disabled={isViewMode || disableCreateSave}
					class="m-0 min-w-0 flex-1 border-0 p-0"
				>
					<div
						class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
					>
						<LPatientRegistrationFirstColumn
							{titleData}
							{genderData}
							{maritalStatusData}
							bind:patientCode
							bind:selectedTitleId
							bind:firstName
							bind:middleName
							bind:lastName
							bind:email
							bind:selectedGenderId
							bind:selectedMaritalStatusId
						/>
						<LPatientRegistrationSecondColumn
							{titleData}
							{countryData}
							{identityTypeData}
							bind:selectedPhoneCountryId
							bind:selectedPhone
							bind:selectedPhoneSecondaryCountryId
							bind:selectedPhoneSecondary
							bind:selectedFatherTitleId
							bind:fatherName
							bind:selectedGuardianTitleId
							bind:selectedGuardianPhoneCountryId
							bind:selectedIdentityTypeId
							bind:identityNo
							bind:dateOfBirth
							dateOfBirthMax={dateTimeUtil.getTodayDateString()}
							bind:guardianName
							bind:guardianPhone
						/>
						<LPatientRegistrationThirdColumn
							{countryData}
							{bloodTypeData}
							{stateData}
							{cityData}
							{postalCodeData}
							{nationalityData}
							{religionData}
							{filteredStateData}
							{filteredCityData}
							{filteredPostalCodeData}
							{selectedCountry}
							{selectedState}
							{selectedCity}
							bind:selectedCountryId
							bind:selectedBloodTypeId
							bind:selectedStateId
							bind:selectedCityId
							bind:selectedPostalCodeId
							bind:selectedNationalityId
							bind:selectedReligionId
							{duplicateCheckLoading}
							showCheckDuplicate={!currentPatientId}
							onCheckDuplicate={checkDuplicate}
						/>
					</div>
				</fieldset>
			</div>
			<fieldset
				disabled={isViewMode || disableCreateSave}
				class="m-0 min-w-0 border-0 p-0"
			>
				<LPatientRegistrationMoreInfo bind:address bind:remark />
				<LPatientRegistrationStatus bind:isActive bind:nameMasking />
			</fieldset>
			<WashCardBodyAction className="mt-6 flex flex-wrap gap-3">
				{#if !isViewMode}
					<WashButton
						type="submit"
						className="btn-primary btn-wide"
						loading={isLoading}
						disabled={disableCreateSave}
					>
						Save
					</WashButton>
					{#if disableCreateSave}
						<WashButton
							type="button"
							className="btn-outline btn-wide"
							onClick={resetPatientFormForNew}
							disabled={isLoading}
						>
							New
						</WashButton>
					{/if}
				{/if}
			</WashCardBodyAction>
		</form>
	</WashCardBody>
</WashCard>

{#if patientCardDialog}
	<LPatientCardPrintModal
		patientId={patientCardDialog.patientId}
		onClose={closePatientCardDialog}
	/>
{/if}
