<script lang="ts">
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDivider from '$lib/component/wash/divider/WashDivider.svelte';
	import WashFileInput from '$lib/component/wash/fileinput/WashFileInput.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import LucideLogOut from '$lib/component/own/library/lucide/LucideLogOut.svelte';
	import LucideUserCog from '$lib/component/own/library/lucide/LucideUserCog.svelte';
	import LucideUserX from '$lib/component/own/library/lucide/LucideUserX.svelte';
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
	import LStaffRegistrationLicenseAndSignatureModal from '$lib/component/own/local/private/medora/administration/staff/registration/modal/LStaffRegistrationLicenseAndSignatureModal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastError, toastSuccess } from '$lib/util/toast-copy.util';

	let { open, onClose, hospitalId, userEmail, staffId } = $props<{
		open: boolean;
		onClose: () => void;
		hospitalId: string | null;
		userEmail: string | null;
		staffId: string | null;
	}>();

	const toastService = new ToastService();
	const routerUtil = new RouterUtil();
	const msg = m as unknown as Record<
		string,
		(inputs?: Record<string, string>) => string
	>;

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
		return hid
			? `/api/medora/hospital/${hid}/home/account-settings`
			: '';
	});

	let isLoading = $state(false);
	let isSaving = $state(false);
	let photoUploading = $state(false);
	let isSendingReset = $state(false);
	let twoFactorEnabled = $state(false);
	type TwoFactorPasswordAction = 'disable' | 'backup';
	let twoFactorPasswordOpen = $state(false);
	let twoFactorPasswordAction = $state<TwoFactorPasswordAction | null>(
		null
	);
	let twoFactorPassword = $state('');
	let isTwoFactorBusy = $state(false);
	let backupCodesOpen = $state(false);
	let freshBackupCodes = $state<string[]>([]);

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
		isLoading ||
			isSaving ||
			photoUploading ||
			isSendingReset ||
			isTwoFactorBusy
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

	async function loadTwoFactorStatus() {
		try {
			const { data } = await authClient.getSession();
			const user = data?.user as
				| { twoFactorEnabled?: boolean | null }
				| undefined;
			twoFactorEnabled = Boolean(user?.twoFactorEnabled);
		} catch (err) {
			console.error(err);
			twoFactorEnabled = false;
		}
	}

	function openTwoFactorPassword(action: TwoFactorPasswordAction) {
		twoFactorPasswordAction = action;
		twoFactorPassword = '';
		twoFactorPasswordOpen = true;
	}

	function closeTwoFactorPassword() {
		twoFactorPasswordOpen = false;
		twoFactorPasswordAction = null;
		twoFactorPassword = '';
	}

	function goToTwoFactorSetup() {
		onClose();
		routerUtil.goToRoute(WebRoutesEnum.TWO_FACTOR_SETUP);
	}

	async function runTwoFactorPasswordAction() {
		if (!twoFactorPasswordAction) return;
		if (!twoFactorPassword.trim()) {
			toastService.addToast(
				m.email_password_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isTwoFactorBusy = true;
		try {
			if (twoFactorPasswordAction === 'disable') {
				const { error } = await authClient.twoFactor.disable({
					password: twoFactorPassword
				});
				if (error) {
					toastError(
						toastService,
						msg.auth_2fa_account_disable_title(),
						m.toast_action_failed(),
						error
					);
					return;
				}
				twoFactorEnabled = false;
				closeTwoFactorPassword();
				toastSuccess(
					toastService,
					msg.auth_2fa_title(),
					msg.auth_2fa_account_disable_success()
				);
				return;
			}

			const { data, error } =
				await authClient.twoFactor.generateBackupCodes({
					password: twoFactorPassword
				});
			if (error) {
				toastError(
					toastService,
					msg.auth_2fa_account_backup_regen_title(),
					m.toast_action_failed(),
					error
				);
				return;
			}
			freshBackupCodes = data?.backupCodes ?? [];
			closeTwoFactorPassword();
			backupCodesOpen = true;
			toastSuccess(
				toastService,
				msg.auth_2fa_title(),
				msg.auth_2fa_account_backup_regen_success()
			);
		} finally {
			isTwoFactorBusy = false;
		}
	}

	async function submitTwoFactorPassword(e: SubmitEvent) {
		e.preventDefault();
		await runTwoFactorPasswordAction();
	}

	async function openAccountSetting() {
		if (!canLoadSettings) {
			toastService.addToast(
				'Hospital context missing.',
				StatusColorEnum.ERROR
			);
			return;
		}
		screen = 'settings';
		await Promise.all([loadAccountSettings(), loadTwoFactorStatus()]);
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
			genderIdStr: row?.genderId != null ? String(row.genderId) : '',
			licenseNo: (row?.licenseNo ?? '').trim(),
			licenseExpiryDate: (row?.licenseExpiryDate ?? '').trim(),
			signatureImageUrl: (row?.signatureImageUrl ?? '').trim(),
			signatureText: (row?.signatureText ?? '').trim()
		};
	}

	async function loadGenderOptions() {
		try {
			const r = await fetch('/api/medora/master/lookup?kind=gender');
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
				genderId: form.genderIdStr ? Number(form.genderIdStr) : null,
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
				const res = await fetch('/api/medora/staff/self', {
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
	<WashDialog
		id="account-settings-modal"
		open={true}
		onClose={handleClose}
		title={screen === 'settings' ? 'Account settings' : 'Account'}
		description={screen === 'settings'
			? 'Manage your profile details and access.'
			: 'Quick actions for your account.'}
		boxClassName={screen === 'settings' ? 'w-[96vw] max-w-3xl' : 'max-w-md'}
	>
		{#if screen === 'settings'}
			<div class="flex flex-col gap-4">
				{#if isLoading}
					<div class="flex items-center gap-3">
						<span class="loading loading-sm loading-spinner"></span>
						<span class="text-sm text-base-content/70">Loading…</span>
					</div>
				{/if}

				<form onsubmit={handleSubmit}>
					<fieldset disabled={isBusy} class="m-0 min-w-0 border-0 p-0">
						<WashCardBodyTitle className="mb-5">Profile Details</WashCardBodyTitle>
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
								<WashFileInput
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
									<WashButton
										type="button"
										className="btn-primary btn-sm"
										onClick={() => photoInputEl?.click()}
										disabled={photoUploading || isBusy}
									>
										{hasPhoto ? 'Change photo' : 'Choose photo'}
									</WashButton>
									<WashButton
										type="button"
										className="btn-error btn-sm"
										onClick={handleRemovePhoto}
										disabled={!hasPhoto || isBusy}
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
									onClick={showLicenseAndSignatureModal}
									disabled={isBusy}
								>
									License &amp; Signature
								</WashButton>
							</div>
						</div>

						<fieldset disabled={isBusy} class="m-0 min-w-0 flex-1 border-0 p-0">
							<div class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4">
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<label for="account-email" class="shrink-0 sm:w-36"
										>Email</label
									>
									<div class="max-w-80 flex-1">
										<WashInputField
											id="account-email"
											value={emailDisplay}
											inputType="email"
											className="validator"
											inputPlaceholderText="mail@site.com"
											disabled
										/>
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<label for="account-first-name" class="shrink-0 sm:w-36"
										>First Name <span class="text-error">*</span></label
									>
									<div class="max-w-80 flex-1">
										<WashInputField
											id="account-first-name"
											bind:value={form.firstName}
											inputType="text"
										/>
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<label for="account-middle-name" class="shrink-0 sm:w-36"
										>Middle Name</label
									>
									<div class="max-w-80 flex-1">
										<WashInputField
											id="account-middle-name"
											bind:value={form.middleName}
											inputType="text"
										/>
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<label for="account-last-name" class="shrink-0 sm:w-36"
										>Last Name <span class="text-error">*</span></label
									>
									<div class="max-w-80 flex-1">
										<WashInputField
											id="account-last-name"
											bind:value={form.lastName}
											inputType="text"
										/>
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<label for="account-phone" class="shrink-0 sm:w-36"
										>Phone</label
									>
									<div class="max-w-80 flex-1">
										<WashInputField
											id="account-phone"
											bind:value={form.phone}
											inputType="tel"
										/>
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<label for="account-gender" class="shrink-0 sm:w-36"
										>Gender</label
									>
									<div class="max-w-80 flex-1">
										<WashSelect
											id="account-gender"
											bind:value={form.genderIdStr}
											optionHeader="Select a gender ..."
										>
											{#each genderOptions as g (g.id)}
												<option value={String(g.id)}
													>{g.name ?? ''}</option
												>
											{/each}
										</WashSelect>
									</div>
								</div>
								<div
									class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
								>
									<label for="account-dob" class="shrink-0 sm:w-36"
										>Date of Birth</label
									>
									<div class="max-w-80 flex-1">
										<WashInputField
											id="account-dob"
											bind:value={form.dateOfBirth}
											inputType="date"
										/>
									</div>
								</div>
							</div>
						</fieldset>
					</div>

					<fieldset disabled={isBusy} class="m-0 min-w-0 border-0 p-0">
						<div
							id="account-settings-more-info"
							class="mt-6 grid grid-cols-1 gap-4 md:gap-6"
						>
							<div class="flex flex-col gap-2">
								<label for="account-address">Address</label>
								<WashTextarea
									id="account-address"
									bind:value={form.address}
									className="w-full min-h-24 resize-y"
								/>
							</div>
						</div>
					</fieldset>
				</form>

				<WashDivider className="text-xs">Security</WashDivider>

				<div class="mt-1">
					<WashCardBodyTitle className="mb-2">Change password</WashCardBodyTitle>
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
						<WashButton
							className="btn btn-outline"
							onClick={handleSendPasswordReset}
							disabled={isBusy || !userEmail?.trim()}
							loading={isSendingReset}
						>
							Send password reset email
						</WashButton>
					</div>
					<div
						class="mt-4 flex flex-col gap-3 border-t border-base-300 pt-4"
					>
						<div class="flex min-w-0 flex-col gap-1">
							<p class="text-sm font-medium">
								{msg.auth_2fa_title()}
							</p>
							<p class="text-sm text-base-content/70">
								{#if twoFactorEnabled}
									{msg.auth_2fa_account_enabled_hint()}
								{:else}
									{msg.auth_2fa_account_hint()}
								{/if}
							</p>
							<p class="text-sm">
								<span class="text-base-content/60"
									>{msg.auth_2fa_account_status_label()}:</span
								>
								<span
									class="ml-2 font-medium {twoFactorEnabled
										? 'text-success'
										: 'text-base-content/80'}"
								>
									{#if twoFactorEnabled}
										{msg.auth_2fa_account_status_on()}
									{:else}
										{msg.auth_2fa_account_status_off()}
									{/if}
								</span>
							</p>
							{#if twoFactorEnabled}
								<p class="text-xs text-base-content/60">
									{msg.auth_2fa_account_multi_device_hint()}
								</p>
								<p class="text-xs text-base-content/60">
									{msg.auth_2fa_account_change_hint()}
								</p>
							{/if}
						</div>
						<div class="flex flex-wrap gap-2">
							{#if twoFactorEnabled}
								<WashButton
									className="btn btn-outline"
									onClick={goToTwoFactorSetup}
									disabled={isBusy}
								>
									{msg.auth_2fa_account_change()}
								</WashButton>
								<WashButton
									className="btn btn-outline"
									onClick={() => openTwoFactorPassword('backup')}
									disabled={isBusy}
								>
									{msg.auth_2fa_account_backup_regen()}
								</WashButton>
								<WashButton
									className="btn btn-outline btn-error"
									onClick={() => openTwoFactorPassword('disable')}
									disabled={isBusy}
								>
									{msg.auth_2fa_account_disable()}
								</WashButton>
							{:else}
								<WashButton
									className="btn btn-outline"
									onClick={goToTwoFactorSetup}
									disabled={isBusy}
								>
									{msg.auth_2fa_setup_title()}
								</WashButton>
							{/if}
						</div>
					</div>
				</div>

				<WashDivider className="text-xs">Danger zone</WashDivider>

				<WashButton
					type="button"
					className="btn-ghost w-full justify-start gap-2 text-error"
					onClick={handleDeactivate}
					disabled={isBusy}
				>
					<LucideUserX className="size-5" />
					Deactivate account
				</WashButton>
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
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<WashButton
						type="button"
						className="btn-ghost w-full justify-start gap-2"
						onClick={openAccountSetting}
						disabled={isBusy}
					>
						<LucideUserCog className="size-5" />
						Account settings
					</WashButton>
					<WashButton
						type="button"
						className="btn-ghost w-full justify-start gap-2"
						onClick={handleLogOut}
						disabled={isBusy}
					>
						<LucideLogOut className="size-5" />
						Log out
					</WashButton>
				</div>
			</div>
		{/if}

		{#snippet actions()}
			<WashButton
				variant="ghost"
				onClick={handleClose}
				disabled={isBusy}
			>
				Close
			</WashButton>
			{#if screen === 'settings'}
				<WashButton
					variant="primary"
					onClick={handleSave}
					disabled={isBusy || !isDirty}
					loading={isSaving}
				>
					Save
				</WashButton>
			{/if}
		{/snippet}
	</WashDialog>

	{#if twoFactorPasswordOpen && twoFactorPasswordAction}
		<WashDialog
			id="account-2fa-password-modal"
			open={true}
			onClose={closeTwoFactorPassword}
			title={twoFactorPasswordAction === 'disable'
				? msg.auth_2fa_account_disable_title()
				: msg.auth_2fa_account_backup_regen_title()}
			description={twoFactorPasswordAction === 'disable'
				? msg.auth_2fa_account_disable_hint()
				: msg.auth_2fa_account_backup_regen_hint()}
			tone={twoFactorPasswordAction === 'disable' ? 'error' : 'primary'}
			boxClassName="max-w-md"
		>
			<form
				id="account-2fa-password-form"
				class="flex flex-col gap-3"
				onsubmit={submitTwoFactorPassword}
			>
				<label class="label" for="account-2fa-password">
					<span class="label-text">{m.password()}</span>
				</label>
				<WashInputField
					id="account-2fa-password"
					inputType="password"
					bind:value={twoFactorPassword}
					className="w-full"
					required
					disabled={isTwoFactorBusy}
				/>
			</form>
			{#snippet actions()}
				<WashButton
					variant="ghost"
					onClick={closeTwoFactorPassword}
					disabled={isTwoFactorBusy}
				>
					{m.cancel()}
				</WashButton>
				<WashButton
					variant={twoFactorPasswordAction === 'disable'
						? 'error'
						: 'primary'}
					onClick={runTwoFactorPasswordAction}
					loading={isTwoFactorBusy}
					disabled={isTwoFactorBusy || !twoFactorPassword.trim()}
				>
					{msg.auth_2fa_account_password_confirm()}
				</WashButton>
			{/snippet}
		</WashDialog>
	{/if}

	{#if backupCodesOpen}
		<WashDialog
			id="account-2fa-backup-codes-modal"
			open={true}
			onClose={() => {
				backupCodesOpen = false;
				freshBackupCodes = [];
			}}
			title={msg.auth_2fa_backup_codes_title()}
			description={msg.auth_2fa_backup_codes_subtitle()}
			tone="secondary"
			boxClassName="max-w-md"
		>
			<ul
				class="menu rounded-box w-full border border-ink-border bg-base-100 p-2 font-mono text-sm"
			>
				{#each freshBackupCodes as backup (backup)}
					<li class="px-2 py-1">{backup}</li>
				{/each}
			</ul>
			{#snippet actions()}
				<WashButton
					variant="primary"
					onClick={() => {
						backupCodesOpen = false;
						freshBackupCodes = [];
					}}
				>
					{msg.auth_2fa_setup_done()}
				</WashButton>
			{/snippet}
		</WashDialog>
	{/if}
{/if}
