<script lang="ts">
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/library/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSkeleton from '$lib/component/library/daisyui/skeleton/DaisyUiSkeleton.svelte';

	import LPatientRegistrationFirstColumn from '$lib/component/local/private/heka/patient/registration/LPatientRegistrationFirstColumn.svelte';
	import LPatientRegistrationSecondColumn from '$lib/component/local/private/heka/patient/registration/LPatientRegistrationSecondColumn.svelte';
	import LPatientRegistrationThirdColumn from '$lib/component/local/private/heka/patient/registration/LPatientRegistrationThirdColumn.svelte';
	import LPatientRegistrationMoreInfo from '$lib/component/local/private/heka/patient/registration/LPatientRegistrationMoreInfo.svelte';
	import LPatientRegistrationStatus from '$lib/component/local/private/heka/patient/registration/LPatientRegistrationStatus.svelte';

	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { browser } from '$app/environment';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum, YesNoEnum } from '$lib/model/enum/db-link';

	import { getGender } from '$lib/remote/table/master-table/gender.remote';
	import { getMaritalStatus } from '$lib/remote/table/master-table/marial-status.remote';
	import { getTitle } from '$lib/remote/table/master-table/title.remote';
	import { getIdentityType } from '$lib/remote/table/master-table/identity-type.remote';
	import { getBloodType } from '$lib/remote/table/master-table/blood-type.remote';
	import { getCountry } from '$lib/remote/table/master-table/country.remote';
	import { getState } from '$lib/remote/table/master-table/state.remote';
	import { getCity } from '$lib/remote/table/master-table/city.remote';
	import { getPostalCode } from '$lib/remote/table/master-table/postal-code.remote';
	import { getNationality } from '$lib/remote/table/master-table/nationality.remote';
	import { getReligion } from '$lib/remote/table/master-table/religion.remote';

	import type {
		BloodTypeSchema,
		CitySchema,
		CountrySchema,
		GenderSchema,
		MaritalStatusSchema,
		IdentityTypeSchema,
		NationalitySchema,
		PostalCodeSchema,
		ReligionSchema,
		StateSchema,
		TitleSchema,
	} from '$lib/server/db/schema-type';

import {
		createPatientWithUser,
		updatePatient,
		getPatientByIdWithRelations,
		getDuplicatePatients
	} from '$lib/remote/table/information-table/patient.remote';
import type { PatientWithRelations } from '$lib/remote/table/information-table/patient.remote';
import { createPatientAttachment } from '$lib/remote/table/information-table/patient-attachment.remote';
import { authClient } from '$lib/auth/client';
import { RouterUtil } from '$lib/util/router.util.svelte';
import { getPatientPhotoDisplayUrl } from '$lib/util/staff-photo.util';
import DaisyUiDivider from '$lib/component/library/daisyui/divider/DaisyUiDivider.svelte';
import DaisyUiFileInput from '$lib/component/library/daisyui/fileinput/DaisyUiFileInput.svelte';
import { page } from '$app/state';
import { dialogService } from '$lib/service/dialog.service.svelte';
import LPatientAttachmentDialogContent from '$lib/component/local/private/heka/patient/attachment/LPatientAttachmentDialogContent.svelte';
import { PatientAttachmentDialogState } from '$lib/state/patient-attachment.dialog.state.svelte';
import LPatientDuplicateModal from '$lib/component/local/private/heka/patient/registration/LPatientDuplicateModal.svelte';

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

	// Lookup data
	let titleData: TitleSchema[] = $state([]);
	let genderData: GenderSchema[] = $state([]);
	let maritalStatusData: MaritalStatusSchema[] = $state([]);
	let identityTypeData: IdentityTypeSchema[] = $state([]);
	let bloodTypeData: BloodTypeSchema[] = $state([]);
	let countryData: CountrySchema[] = $state([]);
	let stateData: StateSchema[] = $state([]);
	let cityData: CitySchema[] = $state([]);
	let postalCodeData: PostalCodeSchema[] = $state([]);
	let nationalityData: NationalitySchema[] = $state([]);
	let religionData: ReligionSchema[] = $state([]);

	// Form state
	let patientCode: string = $state('');
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
		countryData.find((c) => String(c.id) === selectedCountryId) ?? ({} as CountrySchema)
	);
	let selectedState = $derived(
		stateData.find((s) => String(s.id) === selectedStateId) ?? ({} as StateSchema)
	);
	let selectedCity = $derived(
		cityData.find((c) => String(c.id) === selectedCityId) ?? ({} as CitySchema)
	);
	let selectedPostalCode = $derived(
		postalCodeData.find((p) => String(p.id) === selectedPostalCodeId) ?? ({} as PostalCodeSchema)
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
				(selectedStateId && selectedState?.countryId !== selectedCountry.id)
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
				(selectedPostalCodeId && selectedPostalCode?.cityId !== selectedCity.id)
			) {
				selectedPostalCodeId = '';
			}
		}
	});

	let isActive: boolean = $state(true);
	let nameMasking: boolean = $state(false);
	let isLoading: boolean = $state(false);

	let photoFile: File | null = $state(null);
	let photoPreviewUrl: string = $state('');
	let photoUploading: boolean = $state(false);
	let photoInputEl: HTMLInputElement | undefined = $state();

	let duplicateModalOpen = $state(false);
	let duplicateResults = $state<PatientWithRelations[]>([]);
	let duplicateCheckLoading = $state(false);

	async function fetchLookups() {
		titleData = await getTitle();
		genderData = await getGender();
		maritalStatusData = await getMaritalStatus();
		identityTypeData = await getIdentityType();
		bloodTypeData = await getBloodType();
		countryData = await getCountry();
		stateData = await getState();
		cityData = await getCity();
		postalCodeData = await getPostalCode();
		nationalityData = await getNationality();
		religionData = await getReligion();
	}

	async function loadPatientIntoForm(id: string) {
		const patient = await getPatientByIdWithRelations({ id });
		if (!patient) return;
		patientCode = patient.code ?? '';
		selectedTitleId = patient.titleId != null ? String(patient.titleId) : '';
		firstName = patient.firstName ?? '';
		middleName = patient.middleName ?? '';
		lastName = patient.lastName ?? '';
		email = (patient as { user?: { email?: string } }).user?.email ?? '';
		selectedGenderId = patient.genderId != null ? String(patient.genderId) : '';
		selectedMaritalStatusId =
			patient.maritalStatusId != null ? String(patient.maritalStatusId) : '';
		identityNo = patient.identityNo ?? '';
		dateOfBirth = patient.dateOfBirth
			? (typeof patient.dateOfBirth === 'string'
				? patient.dateOfBirth
				: new Date(patient.dateOfBirth).toISOString().slice(0, 10))
			: '';
		selectedFatherTitleId = patient.fatherTitleId != null ? String(patient.fatherTitleId) : '';
		fatherName = (patient as { fatherName?: string }).fatherName ?? '';
		selectedGuardianTitleId = patient.guardianTitleId != null ? String(patient.guardianTitleId) : '';
		guardianName = patient.guardianName ?? '';
		selectedGuardianPhoneCountryId = patient.guardianPhoneCountryId != null ? String(patient.guardianPhoneCountryId) : '';
		address = patient.address ?? '';
		remark = patient.remark ?? '';
		selectedReligionId = patient.religionId != null ? String(patient.religionId) : '';
		selectedIdentityTypeId =
			patient.identityTypeId != null ? String(patient.identityTypeId) : '';
		selectedBloodTypeId =
			patient.bloodTypeId != null ? String(patient.bloodTypeId) : '';
		selectedCountryId = patient.countryId != null ? String(patient.countryId) : '';
		selectedStateId = patient.stateId != null ? String(patient.stateId) : '';
		selectedCityId = patient.cityId != null ? String(patient.cityId) : '';
		selectedPostalCodeId =
			patient.postalCodeId != null ? String(patient.postalCodeId) : '';
		selectedNationalityId =
			patient.nationalityId != null ? String(patient.nationalityId) : '';
		isActive = patient.statusId === StatusEnum.ACTIVE;
		nameMasking =
			(patient as { nameMasking?: number }).nameMasking === YesNoEnum.YES;

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
			const country = countryData.find((c) => c.id === patientPrimaryCountryId);
			selectedPhone =
				country?.countryCallingCode &&
				phonePrimary.startsWith(country.countryCallingCode)
					? phonePrimary.slice(country.countryCallingCode.length).trim()
					: phonePrimary;
		} else {
			const matchPrimary = countryData.find(
				(c) => c.countryCallingCode && phonePrimary.startsWith(c.countryCallingCode)
			);
			if (matchPrimary) {
				selectedPhoneCountryId = String(matchPrimary.id);
				selectedPhone = phonePrimary.slice(
					matchPrimary.countryCallingCode?.length ?? 0
				).trim();
			} else {
				selectedPhoneCountryId = '';
				selectedPhone = phonePrimary;
			}
		}
		if (patientSecondaryCountryId != null) {
			selectedPhoneSecondaryCountryId = String(patientSecondaryCountryId);
			const country = countryData.find(
				(c) => c.id === patientSecondaryCountryId
			);
			selectedPhoneSecondary =
				country?.countryCallingCode &&
				phoneSecondary.startsWith(country.countryCallingCode)
					? phoneSecondary.slice(country.countryCallingCode.length).trim()
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
			) ?? (patient as { photoPath?: string }).photoPath ?? '';
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
		input.value = '';
	}

	function handleRemovePhoto() {
		if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
		photoPreviewUrl = '';
		photoFile = null;
		if (photoInputEl) photoInputEl.value = '';
	}

	function buildPhonePrimary(): string {
		if (!selectedPhoneCountryId || !selectedPhone?.trim()) return selectedPhone?.trim() ?? '';
		const country = countryData.find((c) => String(c.id) === selectedPhoneCountryId);
		return country?.countryCallingCode
			? `${country.countryCallingCode}${selectedPhone.trim()}`
			: selectedPhone.trim();
	}

	async function checkDuplicate() {
		const phonePrimary = buildPhonePrimary();
		if (!firstName?.trim()) {
			toastService.addToast('Enter at least first name to check for duplicates.', StatusColorEnum.ERROR);
			return;
		}
		duplicateCheckLoading = true;
		try {
			const list = await getDuplicatePatients({
				titleId: selectedTitleId ? Number(selectedTitleId) : null,
				firstName: firstName.trim(),
				middleName: middleName.trim(),
				lastName: lastName.trim(),
				fatherTitleId: selectedFatherTitleId ? Number(selectedFatherTitleId) : null,
				fatherName: fatherName.trim(),
				phonePrimary,
				identityTypeId: selectedIdentityTypeId ? Number(selectedIdentityTypeId) : null,
				identityNo: identityNo.trim(),
				excludePatientId: currentPatientId ?? undefined
			});
			duplicateResults = list;
			if (list.length === 0) {
				toastService.addToast('No duplicate patients found.', StatusColorEnum.SUCCESS);
			} else {
				duplicateModalOpen = true;
			}
		} catch (err) {
			console.error(err);
			toastService.addToast('Failed to check for duplicates.', StatusColorEnum.ERROR);
		} finally {
			duplicateCheckLoading = false;
		}
	}

	function handleSelectDuplicatePatient(patient: PatientWithRelations) {
		duplicateModalOpen = false;
		routerUtil.replaceRoute(
			`${page.url.pathname}?edit=${patient.id}`
		);
	}

	async function goToPatientAttachment() {
		const patientName =
			[firstName, middleName, lastName].filter(Boolean).join(' ') || undefined;

		PatientAttachmentDialogState.viewOnly = isViewMode;

		if (currentPatientId) {
			PatientAttachmentDialogState.stagedAttachments = [];
			PatientAttachmentDialogState.pending = {
				patientId: currentPatientId,
				patientName: patientName || undefined
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
			toastService.addToast('First name is required.', StatusColorEnum.ERROR);
			return;
		}
		if (!email.trim()) {
			toastService.addToast('Email is required.', StatusColorEnum.ERROR);
			return;
		}

		const fullName =
			[firstName, middleName, lastName].filter(Boolean).join(' ') || firstName;

		// Build phone with country calling code (staff-style)
		let phonePrimary: string | undefined;
		if (selectedPhoneCountryId && selectedPhone) {
			const country = countryData.find((c) => String(c.id) === selectedPhoneCountryId);
			phonePrimary = country?.countryCallingCode
				? `${country.countryCallingCode}${selectedPhone.trim()}`
				: selectedPhone.trim();
		}
		let phoneSecondary: string | undefined;
		if (selectedPhoneSecondaryCountryId && selectedPhoneSecondary) {
			const country = countryData.find((c) => String(c.id) === selectedPhoneSecondaryCountryId);
			phoneSecondary = country?.countryCallingCode
				? `${country.countryCallingCode}${selectedPhoneSecondary.trim()}`
				: selectedPhoneSecondary.trim();
		}
		let guardianPhone: string | undefined;
		if (selectedGuardianPhoneCountryId && guardianPhone) {
			const country = countryData.find(
				(c) => String(c.id) === selectedGuardianPhoneCountryId
			);
			guardianPhone = country?.countryCallingCode
				? `${country.countryCallingCode}${guardianPhone.trim()}`
				: guardianPhone.trim();
		}

		// Client-only submission handler (uses FormData, fetch, etc.)
		if (!browser) {
			return;
		}

		isLoading = true;
		try {
			if (currentPatientId) {
				// Edit: update existing patient
				await updatePatient({
					id: currentPatientId,
					code: patientCode.trim() || undefined,
					titleId: selectedTitleId ? Number(selectedTitleId) : undefined,
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
					guardianName: guardianName.trim() || undefined,
					guardianPhone,
					guardianPhoneCountryId: selectedGuardianPhoneCountryId
						? Number(selectedGuardianPhoneCountryId)
						: undefined,
					address: address.trim() || undefined,
					remark: remark.trim() || undefined,
					maritalStatusId: selectedMaritalStatusId
						? Number(selectedMaritalStatusId)
						: undefined,
					genderId: selectedGenderId ? Number(selectedGenderId) : undefined,
					identityTypeId: selectedIdentityTypeId
						? Number(selectedIdentityTypeId)
						: undefined,
					bloodTypeId: selectedBloodTypeId
						? Number(selectedBloodTypeId)
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
					religionId: selectedReligionId ? Number(selectedReligionId) : undefined,
					statusId: isActive ? StatusEnum.ACTIVE : StatusEnum.INACTIVE,
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
							await updatePatient({
								id: currentPatientId,
								photoPath: data.url
							});
							photoPreviewUrl =
								getPatientPhotoDisplayUrl(data.url) ?? data.url ?? '';
						}
					} finally {
						photoUploading = false;
					}
				}

				toastService.addToast(
					'Patient updated successfully.',
					StatusColorEnum.SUCCESS
				);
			} else {
				// Create: new patient
				const result = await createPatientWithUser({
					email: email.trim(),
					name: fullName,
					code: patientCode.trim() || undefined,
					titleId: selectedTitleId ? Number(selectedTitleId) : undefined,
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
					fatherTitleId: selectedFatherTitleId ? Number(selectedFatherTitleId) : undefined,
					guardianTitleId: selectedGuardianTitleId ? Number(selectedGuardianTitleId) : undefined,
					guardianName: guardianName.trim() || undefined,
					guardianPhone,
					guardianPhoneCountryId: selectedGuardianPhoneCountryId
						? Number(selectedGuardianPhoneCountryId)
						: undefined,
					address: address.trim() || undefined,
					remark: remark.trim() || undefined,
					religionId: selectedReligionId ? Number(selectedReligionId) : undefined,
					maritalStatusId: selectedMaritalStatusId
						? Number(selectedMaritalStatusId)
						: undefined,
					genderId: selectedGenderId ? Number(selectedGenderId) : undefined,
					identityTypeId: selectedIdentityTypeId
						? Number(selectedIdentityTypeId)
						: undefined,
					bloodTypeId: selectedBloodTypeId
						? Number(selectedBloodTypeId)
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
					isActive,
					nameMasking
				});

				const { patient } = result;

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
							await updatePatient({ id: patient.id, photoPath: data.url });
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
							await createPatientAttachment({
								patientId: patient.id,
								fileUrl: data.url,
								description: item.description.trim() || undefined
							});
						} catch {
							attachmentFailCount += 1;
							toastService.addToast(
								`Failed to save attachment "${item.file.name}".`,
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

				toastService.addToast(
					'Patient created successfully.',
					StatusColorEnum.SUCCESS
				);

				const { error } = await authClient.requestPasswordReset({
					email: email.trim(),
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
				if (photoInputEl) photoInputEl.value = '';
			}
		} catch (error: unknown) {
			let message: string | null = null;

			if (error && typeof error === 'object') {
				const err = error as { message?: string; body?: { message?: string } };
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
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<form onsubmit={handleOnSubmit}>
			<fieldset disabled={isViewMode} class="border-0 p-0 m-0 min-w-0">
				<DaisyUiCardBodyTitle className="mb-5">
					Profile Details
				</DaisyUiCardBodyTitle>
			</fieldset>
			<!-- Flex row: profile column (Attachments button outside disabled fieldset) + form grid -->
			<div
				class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10"
			>
					<!-- Profile block: photo + Choose/Remove/Divider in fieldset; Attachments button outside so it stays clickable in view mode -->
					<div
						class="flex shrink-0 flex-col items-center gap-4 sm:flex-row sm:items-start lg:flex-col lg:items-center"
					>
						<fieldset disabled={isViewMode} class="border-0 p-0 m-0 min-w-0 flex flex-col gap-2 items-center">
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
										alt="Patient profile"
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
									disabled={!photoFile}
								>
									Remove
								</DaisyUiButton>
								<DaisyUiDivider position="horizontal" className="text-xs">
									More Detail
								</DaisyUiDivider>
							</div>
						</fieldset>
						<div class="flex flex-col gap-2">
							<DaisyUiButton
								type="button"
								className="d-btn-outline d-btn-sm"
								onClick={goToPatientAttachment}
							>
								Attachments
								{#if !currentPatientId && stagedAttachmentCount > 0}
									({stagedAttachmentCount})
								{/if}
							</DaisyUiButton>
						</div>
					</div>

					<!-- Form columns: 1 col mobile, 2 md, 3 xl (same as staff) -->
					<fieldset disabled={isViewMode} class="border-0 p-0 m-0 min-w-0 flex-1">
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
						{bloodTypeData}
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
						bind:selectedBloodTypeId
					/>
					<LPatientRegistrationThirdColumn
						{countryData}
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
						bind:selectedStateId
						bind:selectedCityId
						bind:selectedPostalCodeId
						bind:selectedNationalityId
						bind:selectedReligionId
					/>
				</div>
					</fieldset>
			</div>
			<fieldset disabled={isViewMode} class="border-0 p-0 m-0 min-w-0">
				<LPatientRegistrationMoreInfo bind:address bind:remark />
				<LPatientRegistrationStatus bind:isActive bind:nameMasking />

				<DaisyUiCardBodyAction className="mt-6 flex flex-wrap gap-3">
					{#if !isViewMode}
						<DaisyUiButton
							type="button"
							className="d-btn-outline d-btn-wide"
							disabled={duplicateCheckLoading}
							onClick={checkDuplicate}
						>
							{duplicateCheckLoading ? 'Checking...' : 'Check duplicate'}
						</DaisyUiButton>
						<DaisyUiButton
							type="submit"
							className="d-btn-primary d-btn-wide"
							disabled={isLoading}
						>
							{isLoading ? 'Saving...' : 'Save'}
						</DaisyUiButton>
					{/if}
				</DaisyUiCardBodyAction>
			</fieldset>
		</form>
	</DaisyUiCardBody>
</DaisyUiCard>

<LPatientDuplicateModal
	open={duplicateModalOpen}
	duplicates={duplicateResults}
	onClose={() => (duplicateModalOpen = false)}
	onSelectPatient={handleSelectDuplicatePatient}
/>

