<script lang="ts">
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiFileInput from '$lib/component/daisyui/fileinput/DaisyUiFileInput.svelte';
	import DaisyUiDivider from '$lib/component/daisyui/divider/DaisyUiDivider.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import LucideLogOut from '$lib/component/own/library/lucide/LucideLogOut.svelte';
	import LucideUserCog from '$lib/component/own/library/lucide/LucideUserCog.svelte';
	import LucideUserX from '$lib/component/own/library/lucide/LucideUserX.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { getStaffPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import LucideUser from '$lib/component/own/library/lucide/LucideUser.svelte';
	import LStaffRegistrationLicenseAndSignatureModal from '$lib/component/own/local/private/heka/administration/staff/registration/modal/LStaffRegistrationLicenseAndSignatureModal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	let { open, onClose, hospitalId, userEmail, staffId } = $props<{
		open: boolean;
		onClose: () => void;
		hospitalId: string | null;
		userEmail: string | null;
		staffId: string | null;
	}>();

	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	type Screen = 'menu' | 'settings';
	let screen = $state<Screen>('menu');

	type LookupRow = { id: number; name: string | null };

	type AccountSettingsApiRow = {
		email?: string | null;
		firstName?: string | null;
		middleName?: string | null;
		lastName?: string | null;
		photoUrl?: string | null;
		phonePrimary?: string | null;
		address?: string | null;
		dateOfBirth?: string | null;
		genderId?: number | null;
		licenseNo?: string | null;
		licenseExpiryDate?: string | null;
		signatureImageUrl?: string | null;
		signatureText?: string | null;
	};

	const apiBase = $derived.by(() => {
		const hid = hospitalId?.trim() ?? '';
		return hid ? `/api/heka/hospital/${hid}/home/account-settings` : '';
	});

	let isLoading = $state(false);
	let isSaving = $state(false);
	let photoUploading = $state(false);
	let isSendingReset = $state(false);

	let genderOptions = $state<LookupRow[]>([]);

	let photoInputEl: HTMLInputElement | undefined = $state();
	let licenseAndSignatureModalOpen = $state(false);
	let selectedLicenseNo = $state('');
	let selectedLicenseExpiryDate = $state('');
	let signatureFile = $state<File | null>(null);
	let selectedSignatureImageUrl = $state('');
	let selectedSignatureText = $state('');

	let form = $state({
		firstName: '',
		middleName: '',
		lastName: '',
		photoUrl: '' as string | null,
		phone: '',
		address: '',
		dateOfBirth: '',
		genderIdStr: ''
	});
	let initialSnapshot = $state<string>('');

	const emailDisplay = $derived(
		(userEmail ?? '').trim() || '(no email)'
	);
	const photoDisplayUrl = $derived(
		getStaffPhotoDisplayUrl(form.photoUrl)
	);
	const hasPhoto = $derived(!!photoDisplayUrl);
	const canLoadSettings = $derived(!!apiBase);
	const isBusy = $derived(
		isLoading || isSaving || photoUploading || isSendingReset
	);
	const isDirty = $derived.by(() => {
		if (!initialSnapshot) return false;
		const current = JSON.stringify({
			...form,
			licenseNo: selectedLicenseNo,
			licenseExpiryDate: selectedLicenseExpiryDate,
			signatureImageUrl: selectedSignatureImageUrl,
			signatureText: selectedSignatureText
		});
		return current !== initialSnapshot;
	});

	async function handleLogOut() {
		onClose();
		await authClient.signOut();
		routerUtil.goToRoute(WebRoutesEnum.LOGIN);
	}

	async function openAccountSetting() {
		screen = 'settings';
		await loadAccountSettings();
	}

	function backToMenu() {
		screen = 'menu';
	}

	function showLicenseAndSignatureModal() {
		licenseAndSignatureModalOpen = true;
	}

	function normalizeAccountSettings(
		row: AccountSettingsApiRow | null | undefined
	) {
		return {
			firstName: (row?.firstName ?? '').trim(),
			middleName: (row?.middleName ?? '').trim(),
			lastName: (row?.lastName ?? '').trim(),
			photoUrl: row?.photoUrl ?? null,
			phone: (row?.phonePrimary ?? '').trim(),
			address: (row?.address ?? '').trim(),
			dateOfBirth: (row?.dateOfBirth ?? '').trim(),
			genderIdStr:
				row?.genderId != null ? String(row.genderId) : ''
			,
			licenseNo: (row?.licenseNo ?? '').trim(),
			licenseExpiryDate: (row?.licenseExpiryDate ?? '').trim(),
			signatureImageUrl: (row?.signatureImageUrl ?? '').trim(),
			signatureText: (row?.signatureText ?? '').trim()
		};
	}

	async function loadGenderOptions() {
		try {
			const r = await fetch('/api/heka/master/lookup?kind=gender');
			if (!r.ok) {
				throw new Error((await r.text()) || 'Failed to load genders');
			}
			genderOptions = (await r.json()) as LookupRow[];
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to load gender options.',
				StatusColorEnum.ERROR
			);
		}
	}

	async function loadAccountSettings() {
		if (!canLoadSettings) {
			toastService.addToast(
				'Hospital context missing.',
				StatusColorEnum.ERROR
			);
			return;
		}
		isLoading = true;
		try {
			const [settingsRes] = await Promise.all([
				fetch(apiBase, { method: 'GET', credentials: 'include' }),
				genderOptions.length ? Promise.resolve() : loadGenderOptions()
			]);
			if (!settingsRes.ok) {
				throw new Error(
					(await settingsRes.text()) ||
						`Failed to load: ${settingsRes.status}`
				);
			}
			const data = (await settingsRes
				.json()
				.catch(() => null)) as AccountSettingsApiRow | null;
			const normalized = normalizeAccountSettings(data);
			form = {
				firstName: normalized.firstName,
				middleName: normalized.middleName,
				lastName: normalized.lastName,
				photoUrl: normalized.photoUrl,
				phone: normalized.phone,
				address: normalized.address,
				dateOfBirth: normalized.dateOfBirth,
				genderIdStr: normalized.genderIdStr
			};
			selectedLicenseNo = normalized.licenseNo;
			selectedLicenseExpiryDate = normalized.licenseExpiryDate;
			selectedSignatureImageUrl = normalized.signatureImageUrl;
			selectedSignatureText = normalized.signatureText;
			signatureFile = null;
			initialSnapshot = JSON.stringify(normalized);
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to load account settings.',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	function resetFormToInitial() {
		if (!initialSnapshot) return;
		try {
			const snap = JSON.parse(initialSnapshot) as ReturnType<
				typeof normalizeAccountSettings
			>;
			form = {
				firstName: snap.firstName,
				middleName: snap.middleName,
				lastName: snap.lastName,
				photoUrl: snap.photoUrl,
				phone: snap.phone,
				address: snap.address,
				dateOfBirth: snap.dateOfBirth,
				genderIdStr: snap.genderIdStr
			};
			selectedLicenseNo = snap.licenseNo;
			selectedLicenseExpiryDate = snap.licenseExpiryDate;
			selectedSignatureImageUrl = snap.signatureImageUrl;
			selectedSignatureText = snap.signatureText;
			signatureFile = null;
		} catch {
			// ignore
		}
	}

	async function handleSave() {
		if (!canLoadSettings) {
			toastService.addToast(
				'Hospital context missing.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!form.firstName.trim() || !form.lastName.trim()) {
			toastService.addToast(
				'Please enter your first and last name.',
				StatusColorEnum.ERROR
			);
			return;
		}
		isSaving = true;
		try {
			let signatureImageUrlToSave =
				selectedSignatureImageUrl.trim() || null;
			if (signatureFile) {
				const fd = new FormData();
				fd.set('signature', signatureFile);
				const res = await fetch('/api/upload/staff-signature', {
					method: 'POST',
					body: fd
				});
				const data = (await res.json().catch(() => ({}))) as {
					url?: string;
					error?: string;
				};
				if (!res.ok) {
					toastService.addToast(
						data.error ?? 'Signature upload failed.',
						StatusColorEnum.ERROR
					);
					return;
				}
				if (data.url) {
					signatureImageUrlToSave = data.url;
					selectedSignatureImageUrl = data.url;
					signatureFile = null;
				}
			}

			const payload = {
				firstName: form.firstName.trim(),
				middleName: form.middleName.trim() || null,
				lastName: form.lastName.trim(),
				photoUrl: form.photoUrl ?? null,
				phonePrimary: form.phone.trim() || null,
				address: form.address.trim() || null,
				dateOfBirth: form.dateOfBirth || null,
				genderId: form.genderIdStr
					? Number(form.genderIdStr)
					: null
				,
				licenseNo: selectedLicenseNo.trim() || null,
				licenseExpiryDate: selectedLicenseExpiryDate || null,
				signatureImageUrl: signatureImageUrlToSave,
				signatureText: selectedSignatureText.trim() || null
			};

			const r = await fetch(apiBase, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload)
			});
			if (!r.ok) {
				throw new Error(
					(await r.text()) || `Save failed: ${r.status}`
				);
			}

			toastService.addToast(
				'Account settings saved.',
				StatusColorEnum.SUCCESS
			);
			initialSnapshot = JSON.stringify({
				...form,
				licenseNo: selectedLicenseNo,
				licenseExpiryDate: selectedLicenseExpiryDate,
				signatureImageUrl: selectedSignatureImageUrl,
				signatureText: selectedSignatureText
			});
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to save account settings.',
				StatusColorEnum.ERROR
			);
		} finally {
			isSaving = false;
		}
	}

	async function handlePhotoPicked(e: Event) {
		const input = e.currentTarget as HTMLInputElement | null;
		const file = input?.files?.[0];
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
			if (input) input.value = '';
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			toastService.addToast(
				'Image must be 5MB or smaller.',
				StatusColorEnum.ERROR
			);
			if (input) input.value = '';
			return;
		}

		photoUploading = true;
		try {
			const fd = new FormData();
			fd.set('photo', file);
			const res = await fetch('/api/upload/staff-photo', {
				method: 'POST',
				body: fd
			});
			const data = (await res.json().catch(() => ({}))) as {
				url?: string;
				error?: string;
			};
			if (!res.ok) {
				toastService.addToast(
					data.error ?? 'Photo upload failed.',
					StatusColorEnum.ERROR
				);
				return;
			}
			if (data.url) {
				form.photoUrl = data.url;
				toastService.addToast(
					'Photo uploaded. Remember to save.',
					StatusColorEnum.INFO
				);
			}
		} finally {
			photoUploading = false;
			if (input) input.value = '';
		}
	}

	function handleRemovePhoto() {
		form.photoUrl = null;
		if (photoInputEl) photoInputEl.value = '';
		toastService.addToast(
			'Photo removed. Remember to save.',
			StatusColorEnum.INFO
		);
	}

	async function handleSendPasswordReset() {
		const email = (userEmail ?? '').trim();
		if (!email) {
			toastService.addToast(
				'No email found for this account.',
				StatusColorEnum.ERROR
			);
			return;
		}
		isSendingReset = true;
		try {
			const { error } = await authClient.requestPasswordReset({
				email,
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
				'If an account exists for this email, a password reset link has been sent.',
				StatusColorEnum.INFO
			);
		} finally {
			isSendingReset = false;
		}
	}

	async function handleDeactivate() {
		if (!staffId) {
			toastService.addToast(
				'No staff profile linked to this account.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const result = await dialogService.open({
			title: 'Deactivate account',
			message:
				'Are you sure you want to deactivate your account? You can contact an administrator to reactivate it.',
			variant: DialogVariantEnum.CONFIRM
		});
		if (result.confirmed) {
			try {
				const res = await fetch('/api/heka/staff/self', {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						staffId,
						statusId: StatusEnum.INACTIVE
					})
				});
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(t || `Update failed: ${res.status}`);
				}
				toastSuccess(
					toastService,
					m.entity_account(),
					m.toast_action_inactivated()
				);
				onClose();
				await authClient.signOut();
				routerUtil.goToRoute(WebRoutesEnum.LOGIN);
			} catch (err) {
				console.error(err);
				toastService.addToast(
					'Failed to deactivate account.',
					StatusColorEnum.ERROR
				);
			}
		}
	}

	function handleClose() {
		screen = 'menu';
		onClose();
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		handleSave();
	}
</script>

{#if open}
	<DaisyUiModal
		groupName="account-settings-modal"
		open={true}
		onClose={handleClose}
	>
		{#if screen === 'settings'}
			<div class="d-modal-box w-[96vw] max-w-3xl p-0" role="document">
				<DaisyUiCard className="rounded-box">
					<DaisyUiCardBody>
						<div class="flex items-center justify-between gap-3">
							<DaisyUiButton
								className="d-btn-ghost d-btn-sm gap-2"
								onClick={() => {
									resetFormToInitial();
									backToMenu();
								}}
								disabled={isBusy}
							>
								<LucideArrowLeft className="size-5" />
								Back
							</DaisyUiButton>

							<div class="min-w-0 flex-1">
								<DaisyUiCardBodyTitle className="mb-0"
									>Account settings</DaisyUiCardBodyTitle
								>
								<p class="mt-1 text-sm text-base-content/60">
									Manage your profile details and access.
								</p>
							</div>

							<DaisyUiButton
								className="d-btn-ghost d-btn-sm d-btn-circle"
								onClick={handleClose}
								disabled={isBusy}
								title="Close"
							>
								<LucideX className="size-5" />
							</DaisyUiButton>
						</div>

						<div class="mt-4 flex flex-col gap-4">
							{#if isLoading}
								<div class="flex items-center gap-3">
									<span class="d-loading d-loading-spinner d-loading-sm"></span>
									<span class="text-sm text-base-content/70"
										>Loading…</span
									>
								</div>
							{/if}

							<form onsubmit={handleSubmit}>
								<fieldset
									disabled={isBusy}
									class="m-0 min-w-0 border-0 p-0"
								>
									<DaisyUiCardBodyTitle className="mb-5"
										>Profile Details</DaisyUiCardBodyTitle
									>
								</fieldset>

								<div
									class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10"
								>
									<div
										class="flex shrink-0 flex-col items-center gap-4 sm:flex-row sm:items-start lg:flex-col lg:items-center"
									>
										<fieldset
											disabled={isBusy}
											class="m-0 flex min-w-0 flex-col items-center gap-2 border-0 p-0"
										>
											<DaisyUiFileInput
												accept="image/jpeg,image/png,image/webp,image/gif"
												className="hidden"
												bind:inputEl={photoInputEl}
												onchange={handlePhotoPicked}
											/>
											<button
												type="button"
												class="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-base-300 text-base-content/50 focus:ring-2 focus:ring-primary focus:outline-none sm:size-32 lg:size-36"
												onclick={() => photoInputEl?.click()}
												disabled={photoUploading || isBusy}
												aria-label="Choose profile photo"
											>
												{#if photoUploading}
													<span class="text-xs">Uploading…</span>
												{:else if photoDisplayUrl}
													<img
														src={photoDisplayUrl}
														alt="Account profile"
														class="size-full object-cover"
													/>
												{:else}
													<LucideUser className="size-8" />
												{/if}
											</button>
											<div class="flex flex-col gap-2">
												<DaisyUiButton
													type="button"
													className="d-btn-primary d-btn-sm"
													onClick={() => photoInputEl?.click()}
													disabled={photoUploading || isBusy}
												>
													{hasPhoto ? 'Change photo' : 'Choose photo'}
												</DaisyUiButton>
												<DaisyUiButton
													type="button"
													className="d-btn-error d-btn-sm"
													onClick={handleRemovePhoto}
													disabled={!hasPhoto || isBusy}
												>
													Remove
												</DaisyUiButton>
												<DaisyUiDivider
													position="horizontal"
													className="text-xs"
													>More Detail</DaisyUiDivider
												>
											</div>
										</fieldset>
										<div class="flex flex-col gap-2">
											<DaisyUiButton
												type="button"
												className="d-btn-outline d-btn-sm"
												onClick={showLicenseAndSignatureModal}
												disabled={isBusy}
											>
												License &amp; Signature
											</DaisyUiButton>
										</div>
									</div>

									<fieldset
										disabled={isBusy}
										class="m-0 min-w-0 flex-1 border-0 p-0"
									>
										<div
											class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4"
										>
											<div
												class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
											>
												<DaisyUiLabel
													forText="account-email"
													className="shrink-0 sm:w-36"
													>Email</DaisyUiLabel
												>
												<div class="max-w-80 flex-1">
													<DaisyUiInputField
														id="account-email"
														value={emailDisplay}
														inputType="email"
														className="d-validator"
														inputPlaceholderText="mail@site.com"
														disabled
													/>
												</div>
											</div>
											<div
												class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
											>
												<DaisyUiLabel
													forText="account-first-name"
													className="shrink-0 sm:w-36"
													>First Name <span class="text-error">*</span
													></DaisyUiLabel
												>
												<div class="max-w-80 flex-1">
													<DaisyUiInputField
														id="account-first-name"
														bind:value={form.firstName}
														inputType="text"
													/>
												</div>
											</div>
											<div
												class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
											>
												<DaisyUiLabel
													forText="account-middle-name"
													className="shrink-0 sm:w-36"
													>Middle Name</DaisyUiLabel
												>
												<div class="max-w-80 flex-1">
													<DaisyUiInputField
														id="account-middle-name"
														bind:value={form.middleName}
														inputType="text"
													/>
												</div>
											</div>
											<div
												class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
											>
												<DaisyUiLabel
													forText="account-last-name"
													className="shrink-0 sm:w-36"
													>Last Name <span class="text-error">*</span
													></DaisyUiLabel
												>
												<div class="max-w-80 flex-1">
													<DaisyUiInputField
														id="account-last-name"
														bind:value={form.lastName}
														inputType="text"
													/>
												</div>
											</div>
											<div
												class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
											>
												<DaisyUiLabel
													forText="account-phone"
													className="shrink-0 sm:w-36"
													>Phone</DaisyUiLabel
												>
												<div class="max-w-80 flex-1">
													<DaisyUiInputField
														id="account-phone"
														bind:value={form.phone}
														inputType="tel"
													/>
												</div>
											</div>
											<div
												class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
											>
												<DaisyUiLabel
													forText="account-gender"
													className="shrink-0 sm:w-36"
													>Gender</DaisyUiLabel
												>
												<div class="max-w-80 flex-1">
													<DaisyUiSelect
														id="account-gender"
														bind:value={form.genderIdStr}
														optionHeader="Select a gender ..."
													>
														{#each genderOptions as g (g.id)}
															<option value={String(g.id)}
																>{g.name ?? ''}</option
															>
														{/each}
													</DaisyUiSelect>
												</div>
											</div>
											<div
												class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
											>
												<DaisyUiLabel
													forText="account-dob"
													className="shrink-0 sm:w-36"
													>Date of Birth</DaisyUiLabel
												>
												<div class="max-w-80 flex-1">
													<DaisyUiInputField
														id="account-dob"
														bind:value={form.dateOfBirth}
														inputType="date"
													/>
												</div>
											</div>
										</div>
									</fieldset>
								</div>

								<fieldset
									disabled={isBusy}
									class="m-0 min-w-0 border-0 p-0"
								>
									<div
										id="account-settings-more-info"
										class="mt-6 grid grid-cols-1 gap-4 md:gap-6"
									>
										<div class="flex flex-col gap-2">
											<DaisyUiLabel forText="account-address"
												>Address</DaisyUiLabel
											>
											<DaisyUiTextarea
												id="account-address"
												bind:value={form.address}
												className="w-full min-h-24 resize-y"
											/>
										</div>
									</div>

									<DaisyUiCardBodyAction
										className="mt-6 flex flex-wrap gap-3"
									>
										<DaisyUiButton
											type="button"
											className="d-btn-outline d-btn-wide"
											onClick={() => {
												resetFormToInitial();
												backToMenu();
											}}
											disabled={isBusy}
										>
											Cancel
										</DaisyUiButton>
										<DaisyUiButton
											type="submit"
											className="d-btn-wide d-btn-primary"
											disabled={isBusy || !isDirty}
											loading={isSaving}
										>
											Save
										</DaisyUiButton>
									</DaisyUiCardBodyAction>
								</fieldset>
							</form>

							<DaisyUiDivider position="horizontal" className="text-xs"
								>Security</DaisyUiDivider
							>

							<div class="mt-1">
								<DaisyUiCardBodyTitle className="mb-2"
									>Change password</DaisyUiCardBodyTitle
								>
								<p class="text-sm text-base-content/60">
									We’ll send a reset link to your email.
								</p>
								<div
									class="mt-3 flex flex-wrap items-center justify-between gap-3"
								>
									<p class="text-sm">
										<span class="text-base-content/60">Email:</span>
										<span class="ml-2 font-medium">{emailDisplay}</span>
									</p>
									<DaisyUiButton
										className="d-btn d-btn-outline"
										onClick={handleSendPasswordReset}
										disabled={isBusy || !userEmail?.trim()}
										loading={isSendingReset}
									>
										Send password reset email
									</DaisyUiButton>
								</div>
							</div>
						</div>
					</DaisyUiCardBody>
				</DaisyUiCard>
			</div>
			<LStaffRegistrationLicenseAndSignatureModal
				bind:open={licenseAndSignatureModalOpen}
				bind:licenseNo={selectedLicenseNo}
				bind:licenseExpiryDate={selectedLicenseExpiryDate}
				bind:signatureFile
				bind:signatureText={selectedSignatureText}
				initialSignatureImageUrl={selectedSignatureImageUrl}
				viewOnly={false}
			/>
		{:else}
			<div class="d-modal-box max-w-md p-0" role="document">
				<DaisyUiCard className="rounded-box">
					<DaisyUiCardBody>
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0">
								<DaisyUiCardBodyTitle className="mb-0"
									>Account</DaisyUiCardBodyTitle
								>
								<p class="mt-1 text-sm text-base-content/60">
									Quick actions for your account.
								</p>
							</div>
							<DaisyUiButton
								className="d-btn-ghost d-btn-sm d-btn-circle"
								onClick={handleClose}
								title="Close"
							>
								<LucideX className="size-5" />
							</DaisyUiButton>
						</div>

						<div class="mt-4 flex flex-col gap-4">
							<div class="flex flex-col gap-2">
								<DaisyUiButton
									className="d-btn-ghost w-full justify-start gap-2"
									onClick={openAccountSetting}
									disabled={isBusy}
								>
									<LucideUserCog className="size-5" />
									Account settings
								</DaisyUiButton>
								<DaisyUiButton
									className="d-btn-ghost w-full justify-start gap-2"
									onClick={handleLogOut}
									disabled={isBusy}
								>
									<LucideLogOut className="size-5" />
									Log out
								</DaisyUiButton>
							</div>

							<DaisyUiDivider position="horizontal" className="text-xs"
								>Danger zone</DaisyUiDivider
							>

							<DaisyUiButton
								className="d-btn-ghost w-full justify-start gap-2 text-error"
								onClick={handleDeactivate}
								disabled={isBusy}
							>
								<LucideUserX className="size-5" />
								Deactivate account
							</DaisyUiButton>
						</div>
					</DaisyUiCardBody>
				</DaisyUiCard>
			</div>
		{/if}
	</DaisyUiModal>
{/if}
