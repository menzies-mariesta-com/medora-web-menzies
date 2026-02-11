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
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

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

	import type {
		BloodTypeSchema,
		CitySchema,
		CountrySchema,
		GenderSchema,
		MaritalStatusSchema,
		IdentityTypeSchema,
		NationalitySchema,
		PostalCodeSchema,
		StateSchema,
		TitleSchema,
	} from '$lib/server/db/schema-type';

import { createPatientWithUser, updatePatient } from '$lib/remote/table/information-table/patient.remote';
import { authClient } from '$lib/auth/client';
import { RouterUtil } from '$lib/util/router.util.svelte';
import { getStaffPhotoDisplayUrl } from '$lib/util/staff-photo.util';
import DaisyUiDivider from '$lib/component/library/daisyui/divider/DaisyUiDivider.svelte';
import { page } from '$app/state';
import { dialogService } from '$lib/service/dialog.service.svelte';
import LPatientAttachmentDialogContent from '$lib/component/local/private/heka/patient/attachment/LPatientAttachmentDialogContent.svelte';
import { PatientAttachmentDialogState } from '$lib/state/patient-attachment.dialog.state.svelte';

const lifeCycleUtil = new LifeCycleUtil();
const dateTimeUtil = new DateTimeUtil();
const toastService = new ToastService();
const routerUtil = new RouterUtil();

const viewId = $derived(page.url.searchParams.get('view'));
const editId = $derived(page.url.searchParams.get('edit'));
const currentPatientId = $derived(viewId || editId);

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

	// Form state
	let patientCode: string = $state('');
	let selectedTitleId: string = $state('');
	let firstName: string = $state('');
	let middleName: string = $state('');
	let lastName: string = $state('');
	let email: string = $state('');
	let selectedPhoneCountryId: string = $state('');
	let selectedPhone: string = $state('');
	let selectedPhoneSecondaryCountryId: string = $state('');
	let selectedPhoneSecondary: string = $state('');
	let identityNo: string = $state('');
	let dateOfBirth: string = $state('');
	let guardianName: string = $state('');
	let guardianPhone: string = $state('');
	let address: string = $state('');
	let remark: string = $state('');
	let religion: string = $state('');

	let selectedGenderId: string = $state('');
	let selectedMaritalStatusId: string = $state('');
	let selectedIdentityTypeId: string = $state('');
	let selectedBloodTypeId: string = $state('');
	let selectedCountryId: string = $state('');
	let selectedStateId: string = $state('');
	let selectedCityId: string = $state('');
	let selectedPostalCodeId: string = $state('');
	let selectedNationalityId: string = $state('');

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
	let isLoading: boolean = $state(false);

	let photoFile: File | null = $state(null);
	let photoPreviewUrl: string = $state('');
	let photoUploading: boolean = $state(false);
	let photoInputEl: HTMLInputElement | undefined = $state();

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
	}

	lifeCycleUtil.onMount(() => {
		fetchLookups();
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

	async function goToPatientAttachment() {
		if (!currentPatientId) {
			toastService.addToast(
				'You can add attachments after opening an existing patient (view or edit).',
				StatusColorEnum.ERROR
			);
			return;
		}

		const patientName =
			[firstName, middleName, lastName].filter(Boolean).join(' ') || undefined;

		PatientAttachmentDialogState.pending = {
			patientId: currentPatientId,
			patientName: patientName || undefined
		};

		await dialogService.open({
			title: 'Patient attachments',
			fullScreen: true,
			component: LPatientAttachmentDialogContent
		});

		PatientAttachmentDialogState.pending = null;
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

		isLoading = true;
		try {
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
				phonePrimaryCountryId: selectedPhoneCountryId ? Number(selectedPhoneCountryId) : undefined,
				phoneSecondaryCountryId: selectedPhoneSecondaryCountryId ? Number(selectedPhoneSecondaryCountryId) : undefined,
				identityNo: identityNo.trim() || undefined,
				dateOfBirth: dateOfBirth || undefined,
				guardian_name: guardianName.trim() || undefined,
				guardian_phone: guardianPhone.trim() || undefined,
				address: address.trim() || undefined,
				remark: remark.trim() || undefined,
				religion: religion.trim() || undefined,
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
				postalCodeId: selectedPostalCodeId ? Number(selectedPostalCodeId) : undefined,
				nationalityId: selectedNationalityId ? Number(selectedNationalityId) : undefined,
				isActive,
			});

			const { patient } = result;

			// Upload profile photo and update patient.photo_path
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
					} else if (data.url) {
						await updatePatient({ id: patient.id, photo_path: data.url });
						photoPreviewUrl =
							getStaffPhotoDisplayUrl(data.url) ?? data.url ?? '';
					}
				} finally {
					photoUploading = false;
				}
			}

			toastService.addToast(
				'Patient created successfully.',
				StatusColorEnum.SUCCESS,
			);

			// Send reset password email to patient
			const { error } = await authClient.requestPasswordReset({
				email: email.trim(),
				redirectTo: routerUtil.getResetRedirectUrl(),
			});

			if (error) {
				toastService.addToast(
					error.message ?? 'Failed to send reset link.',
					StatusColorEnum.ERROR,
				);
			} else {
				toastService.addToast(
					'Reset password email has been sent to the patient.',
					StatusColorEnum.INFO,
				);
			}

			// Reset form
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
			identityNo = '';
			dateOfBirth = '';
			guardianName = '';
			guardianPhone = '';
			address = '';
			remark = '';
			religion = '';
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
			if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
			photoPreviewUrl = '';
			photoFile = null;
			if (photoInputEl) photoInputEl.value = '';
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
				message = 'Failed to create patient. Please try again.';
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
			<DaisyUiCardBodyTitle className="mb-5">
				Profile Details
			</DaisyUiCardBodyTitle>

			<!-- Profile + Main form grid: responsive (same as staff registration) -->
			<div
				class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10"
			>
				<!-- Profile block: photo upload + preview -->
				<div
					class="flex shrink-0 flex-col items-center gap-4 sm:flex-row sm:items-start lg:flex-col lg:items-center"
				>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						class="hidden"
						bind:this={photoInputEl}
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
						<DaisyUiButton
							type="button"
							className="d-btn-outline d-btn-sm"
							onClick={goToPatientAttachment}
						>
							Attachments
						</DaisyUiButton>
					</div>
				</div>

				<!-- Form columns: 1 col mobile, 2 md, 3 xl (same as staff) -->
				<div
					class="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
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
						{countryData}
						{identityTypeData}
						{bloodTypeData}
						bind:selectedPhoneCountryId
						bind:selectedPhone
						bind:selectedPhoneSecondaryCountryId
						bind:selectedPhoneSecondary
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
						bind:religion
					/>
				</div>
			</div>

			<LPatientRegistrationMoreInfo bind:address bind:remark />
			<LPatientRegistrationStatus bind:isActive />

			<DaisyUiCardBodyAction className="mt-6">
				<DaisyUiButton
					type="submit"
					className="d-btn-primary d-btn-wide"
					disabled={isLoading}
				>
					{isLoading ? 'Saving...' : 'Save'}
				</DaisyUiButton>
			</DaisyUiCardBodyAction>
		</form>
	</DaisyUiCardBody>
</DaisyUiCard>

