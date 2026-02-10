<script lang="ts">
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/library/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSkeleton from '$lib/component/library/daisyui/skeleton/DaisyUiSkeleton.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';

	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	import { getGender } from '$lib/remote/table/master-table/gender.remote';
	import { getMaritalStatus } from '$lib/remote/table/master-table/marial-status.remote';
	import { getIdentityType } from '$lib/remote/table/master-table/identity-type.remote';
	import { getBloodType } from '$lib/remote/table/master-table/blood-type.remote';

	import type {
		GenderSchema,
		MaritalStatusSchema,
		IdentityTypeSchema,
		BloodTypeSchema,
	} from '$lib/server/db/schema-type';

	import { createPatientWithUser, updatePatient } from '$lib/remote/table/information-table/patient.remote';
	import { authClient } from '$lib/auth/client';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { getStaffPhotoDisplayUrl } from '$lib/util/staff-photo.util';

	const lifeCycleUtil = new LifeCycleUtil();
	const dateTimeUtil = new DateTimeUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	// Lookup data
	let genderData: GenderSchema[] = $state([]);
	let maritalStatusData: MaritalStatusSchema[] = $state([]);
	let identityTypeData: IdentityTypeSchema[] = $state([]);
	let bloodTypeData: BloodTypeSchema[] = $state([]);

	// Form state
	let patientCode: string = $state('');
	let registrationNo: string = $state('');
	let firstName: string = $state('');
	let middleName: string = $state('');
	let lastName: string = $state('');
	let email: string = $state('');
	let phonePrimary: string = $state('');
	let phoneSecondary: string = $state('');
	let identityNo: string = $state('');
	let dateOfBirth: string = $state('');
	let guardianName: string = $state('');
	let guardianPhone: string = $state('');
	let address: string = $state('');
	let remarks: string = $state('');

	let selectedGenderId: string = $state('');
	let selectedMaritalStatusId: string = $state('');
	let selectedIdentityTypeId: string = $state('');
	let selectedBloodTypeId: string = $state('');

	let isActive: boolean = $state(true);
	let isLoading: boolean = $state(false);

	let photoFile: File | null = $state(null);
	let photoPreviewUrl: string = $state('');
	let photoUploading: boolean = $state(false);
	let photoInputEl: HTMLInputElement | undefined = $state();

	async function fetchLookups() {
		genderData = await getGender();
		maritalStatusData = await getMaritalStatus();
		identityTypeData = await getIdentityType();
		bloodTypeData = await getBloodType();
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

		isLoading = true;
		try {
			const result = await createPatientWithUser({
				email: email.trim(),
				name: fullName,
				code: patientCode.trim() || undefined,
				registrationNo: registrationNo.trim() || undefined,
				firstName: firstName.trim(),
				middleName: middleName.trim() || undefined,
				lastName: lastName.trim() || undefined,
				phonePrimary: phonePrimary.trim() || undefined,
				phoneSecondary: phoneSecondary.trim() || undefined,
				identityNo: identityNo.trim() || undefined,
				dateOfBirth: dateOfBirth || undefined,
				guardian_name: guardianName.trim() || undefined,
				guardian_phone: guardianPhone.trim() || undefined,
				address: address.trim() || undefined,
				remarks: remarks.trim() || undefined,
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
			registrationNo = '';
			firstName = '';
			middleName = '';
			lastName = '';
			email = '';
			phonePrimary = '';
			phoneSecondary = '';
			identityNo = '';
			dateOfBirth = '';
			guardianName = '';
			guardianPhone = '';
			address = '';
			remarks = '';
			selectedGenderId = '';
			selectedMaritalStatusId = '';
			selectedIdentityTypeId = '';
			selectedBloodTypeId = '';
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
				Patient Details
			</DaisyUiCardBodyTitle>

			<!-- Profile + Main form grid: same layout as staff -->
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
					</div>
				</div>

				<!-- Form columns: 1 col mobile, 2 cols md+ -->
				<div
					class="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2"
				>
					<!-- Basic info -->
					<div class="space-y-3">
					<DaisyUiInputField
						inputPlaceholderText="Patient code"
						className="w-full"
						bind:value={patientCode}
					/>
					<DaisyUiInputField
						inputPlaceholderText="Registration no"
						className="w-full"
						bind:value={registrationNo}
					/>
					<DaisyUiInputField
						inputPlaceholderText="First name *"
						className="w-full"
						bind:value={firstName}
					/>
					<DaisyUiInputField
						inputPlaceholderText="Middle name"
						className="w-full"
						bind:value={middleName}
					/>
					<DaisyUiInputField
						inputPlaceholderText="Last name"
						className="w-full"
						bind:value={lastName}
					/>
					<DaisyUiInputField
						inputPlaceholderText="Email *"
						inputType="email"
						className="w-full"
						bind:value={email}
					/>
					<DaisyUiInputField
						inputPlaceholderText="Primary phone"
						className="w-full"
						bind:value={phonePrimary}
					/>
					<DaisyUiInputField
						inputPlaceholderText="Secondary phone"
						className="w-full"
						bind:value={phoneSecondary}
					/>
					<DaisyUiInputField
						inputPlaceholderText="Identity no"
						className="w-full"
						bind:value={identityNo}
					/>
					<label class="form-control w-full">
						<span class="label-text mb-1 text-sm opacity-80">
							Date of birth
						</span>
						<input
							type="date"
							class="d-input w-full"
							bind:value={dateOfBirth}
							max={dateTimeUtil.getTodayDateString()}
						/>
					</label>
				</div>

					<!-- Guardian + demographics -->
					<div class="space-y-3">
					<DaisyUiInputField
						inputPlaceholderText="Guardian name"
						className="w-full"
						bind:value={guardianName}
					/>
					<DaisyUiInputField
						inputPlaceholderText="Guardian phone"
						className="w-full"
						bind:value={guardianPhone}
					/>

					<label class="form-control w-full">
						<span class="label-text mb-1 text-sm opacity-80">
							Gender
						</span>
						<DaisyUiSelect className="w-full" bind:value={selectedGenderId}>
							{#each genderData as g (g.id)}
								<option value={g.id}>{g.name}</option>
							{/each}
						</DaisyUiSelect>
					</label>

					<label class="form-control w-full">
						<span class="label-text mb-1 text-sm opacity-80">
							Marital status
						</span>
						<DaisyUiSelect
							className="w-full"
							bind:value={selectedMaritalStatusId}
						>
							{#each maritalStatusData as m (m.id)}
								<option value={m.id}>{m.name}</option>
							{/each}
						</DaisyUiSelect>
					</label>

					<label class="form-control w-full">
						<span class="label-text mb-1 text-sm opacity-80">
							Identity type
						</span>
						<DaisyUiSelect
							className="w-full"
							bind:value={selectedIdentityTypeId}
						>
							{#each identityTypeData as it (it.id)}
								<option value={it.id}>{it.name}</option>
							{/each}
						</DaisyUiSelect>
					</label>

					<label class="form-control w-full">
						<span class="label-text mb-1 text-sm opacity-80">
							Blood type
						</span>
						<DaisyUiSelect className="w-full" bind:value={selectedBloodTypeId}>
							{#each bloodTypeData as b (b.id)}
								<option value={b.id}>{b.name}</option>
							{/each}
						</DaisyUiSelect>
					</label>

					<label class="form-control w-full">
						<span class="label-text mb-1 text-sm opacity-80">
							Address
						</span>
						<textarea
							class="d-textarea h-24 w-full"
							placeholder="Address"
							bind:value={address}
						></textarea>
					</label>

					<label class="form-control w-full">
						<span class="label-text mb-1 text-sm opacity-80">
							Remarks
						</span>
						<textarea
							class="d-textarea h-24 w-full"
							placeholder="Remarks"
							bind:value={remarks}
						></textarea>
					</label>

					<label class="flex items-center gap-2 pt-2">
						<input
							type="checkbox"
							class="d-checkbox d-checkbox-primary"
							bind:checked={isActive}
						/>
						<span class="text-sm">Active</span>
					</label>
					</div>
				</div>
			</div>

			<DaisyUiCardBodyAction className="mt-4">
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

