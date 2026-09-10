<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import WashOtp from '$lib/component/wash/otp/WashOtp.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import LucideShieldCheck from '$lib/component/own/library/lucide/LucideShieldCheck.svelte';
	import AuthTemplateCard from '$lib/component/own/local/public/auth/shared/AuthTemplateCard.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { toastError, toastSuccess } from '$lib/util/toast-copy.util';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Menzies Design Templates → Auth → 2FA via AuthTemplateCard + WashOtp.
	 */
	const toastService = new ToastService();
	const msg = m as unknown as Record<
		string,
		(inputs?: Record<string, string>) => string
	>;

	function sanitizeRedirectTo(redirectTo: string | null) {
		if (!redirectTo) return WebRoutesEnum.MEDORA_HOSPITAL;
		const value = redirectTo.trim();
		const lower = value.toLowerCase();
		if (!value.startsWith('/')) return WebRoutesEnum.MEDORA_HOSPITAL;
		if (value.startsWith('//')) return WebRoutesEnum.MEDORA_HOSPITAL;
		if (lower.startsWith('http:') || lower.startsWith('https:'))
			return WebRoutesEnum.MEDORA_HOSPITAL;
		return value;
	}

	const redirectTarget = $derived(
		sanitizeRedirectTo(page.url.searchParams.get('redirectTo'))
	);

	let code = $state('');
	let backupCode = $state('');
	let trustDevice = $state(true);
	let useBackupCode = $state(false);
	let isLoading = $state(false);

	async function handleVerify(e: SubmitEvent) {
		e.preventDefault();
		isLoading = true;
		try {
			if (useBackupCode) {
				const trimmed = backupCode.trim();
				if (!trimmed) {
					toastService.addToast(
						m.toast_code_required(),
						StatusColorEnum.ERROR
					);
					return;
				}
				const { error } = await authClient.twoFactor.verifyBackupCode({
					code: trimmed,
					trustDevice
				});
				if (error) {
					toastError(
						toastService,
						msg.auth_2fa_title(),
						m.toast_action_failed(),
						error
					);
					return;
				}
			} else {
				if (code.length < 6) {
					toastService.addToast(
						m.toast_code_required(),
						StatusColorEnum.ERROR
					);
					return;
				}
				const { error } = await authClient.twoFactor.verifyTotp({
					code,
					trustDevice
				});
				if (error) {
					toastError(
						toastService,
						msg.auth_2fa_title(),
						m.toast_action_failed(),
						error
					);
					return;
				}
			}
			toastSuccess(
				toastService,
				msg.auth_2fa_title(),
				msg.auth_2fa_verified()
			);
			await goto(redirectTarget);
		} finally {
			isLoading = false;
		}
	}
</script>

<form class="mx-auto w-full max-w-sm" onsubmit={handleVerify} novalidate>
	<AuthTemplateCard
		title={msg.auth_2fa_title()}
		description={msg.auth_2fa_subtitle()}
		titleTone="primary"
	>
		{#snippet leading()}
			<div class="rounded-box bg-primary/10 p-2">
				<LucideShieldCheck className="size-5 text-primary" strokeWidth={2} />
			</div>
		{/snippet}

		{#if useBackupCode}
			<fieldset class="fieldset">
				<label class="label" for="2fa-backup-code">
					<span class="label-text">
						{msg.auth_2fa_backup_label()}<span
							class="align-top text-sm leading-none text-error"
							aria-hidden="true">*</span
						>
					</span>
				</label>
				<WashInputField
					id="2fa-backup-code"
					inputType="text"
					bind:value={backupCode}
					inputPlaceholderText={msg.auth_2fa_backup_placeholder()}
					className="w-full"
					required
				/>
			</fieldset>
		{:else}
			<fieldset class="fieldset">
				<label class="label" for="2fa-totp-code">
					<span class="label-text">
						{msg.auth_2fa_code_label()}<span
							class="align-top text-sm leading-none text-error"
							aria-hidden="true">*</span
						>
					</span>
				</label>
				<WashOtp
					id="2fa-totp-code"
					className="w-full"
					bind:value={code}
					ariaLabel="6-digit verification code"
					required
				/>
			</fieldset>
		{/if}

		<label class="label cursor-pointer justify-start gap-2 py-0">
			<WashCheckbox className="checkbox-sm" bind:checked={trustDevice} />
			<span class="label-text text-sm">{msg.auth_2fa_trust_device()}</span>
		</label>

		{#snippet actions()}
			<WashButton
				type="submit"
				className="btn-primary w-full"
				loading={isLoading}
				loadingText={m.loading()}
			>
				{msg.auth_2fa_verify()}
			</WashButton>
			<button
				type="button"
				class="link link-secondary cursor-pointer text-center text-sm"
				onclick={() => {
					useBackupCode = !useBackupCode;
					code = '';
					backupCode = '';
				}}
			>
				{useBackupCode
					? msg.auth_2fa_use_authenticator()
					: msg.auth_2fa_use_backup()}
			</button>
			<a
				class="link link-secondary cursor-pointer text-center text-sm"
				href={WebRoutesEnum.LOGIN}
			>
				{m.back_to_login()}
			</a>
		{/snippet}
	</AuthTemplateCard>
</form>
