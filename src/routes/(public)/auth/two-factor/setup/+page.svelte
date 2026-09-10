<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashOtp from '$lib/component/wash/otp/WashOtp.svelte';
	import LucideShield from '$lib/component/own/library/lucide/LucideShield.svelte';
	import AuthTemplateCard from '$lib/component/own/local/public/auth/shared/AuthTemplateCard.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { toastError, toastSuccess } from '$lib/util/toast-copy.util';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Menzies Design 2FA setup (Templates → Auth → 2FA setup):
	 * password → QR / secret → confirm TOTP → show backup codes.
	 */
	const toastService = new ToastService();
	const msg = m as unknown as Record<
		string,
		(inputs?: Record<string, string>) => string
	>;

	type Step = 'password' | 'confirm' | 'backup';

	let step = $state<Step>('password');
	let password = $state('');
	let code = $state('');
	let totpURI = $state('');
	let qrDataUrl = $state('');
	let backupCodes = $state<string[]>([]);
	let isLoading = $state(false);
	let sessionChecked = $state(false);
	let alreadyEnabled = $state(false);

	onMount(async () => {
		const { data } = await authClient.getSession();
		if (!data?.session) {
			await goto(
				`${WebRoutesEnum.LOGIN}?redirectTo=${encodeURIComponent(WebRoutesEnum.TWO_FACTOR_SETUP)}`
			);
			return;
		}
		const user = data.user as { twoFactorEnabled?: boolean | null };
		alreadyEnabled = Boolean(user?.twoFactorEnabled);
		sessionChecked = true;
	});

	async function buildQr(uri: string) {
		const QRCode = (await import('qrcode')).default;
		qrDataUrl = await QRCode.toDataURL(uri, {
			margin: 1,
			width: 220
		});
	}

	async function handleEnable(e: SubmitEvent) {
		e.preventDefault();
		if (!password.trim()) {
			toastService.addToast(
				m.email_password_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isLoading = true;
		try {
			const { data, error } = await authClient.twoFactor.enable({
				password
			});
			if (error) {
				toastError(
					toastService,
					msg.auth_2fa_setup_title(),
					m.toast_action_failed(),
					error
				);
				return;
			}
			if (!data?.totpURI) {
				toastService.addToast(
					m.toast_action_failed(),
					StatusColorEnum.ERROR
				);
				return;
			}
			totpURI = data.totpURI;
			backupCodes = data.backupCodes ?? [];
			await buildQr(totpURI);
			step = 'confirm';
		} finally {
			isLoading = false;
		}
	}

	async function handleConfirm(e: SubmitEvent) {
		e.preventDefault();
		if (code.length < 6) {
			toastService.addToast(m.toast_code_required(), StatusColorEnum.ERROR);
			return;
		}
		isLoading = true;
		try {
			const { error } = await authClient.twoFactor.verifyTotp({
				code
			});
			if (error) {
				toastError(
					toastService,
					msg.auth_2fa_setup_title(),
					m.toast_action_failed(),
					error
				);
				return;
			}
			toastSuccess(
				toastService,
				msg.auth_2fa_setup_title(),
				msg.auth_2fa_setup_success()
			);
			step = 'backup';
		} finally {
			isLoading = false;
		}
	}

	const manualSecret = $derived.by(() => {
		try {
			const secret = new URL(totpURI).searchParams.get('secret');
			return secret ?? '';
		} catch {
			return '';
		}
	});
</script>

{#if sessionChecked}
	{#if step === 'password'}
		<form class="mx-auto w-full max-w-sm" onsubmit={handleEnable}>
			<AuthTemplateCard
				title={alreadyEnabled
					? msg.auth_2fa_account_change()
					: msg.auth_2fa_setup_title()}
				description={alreadyEnabled
					? msg.auth_2fa_setup_change_subtitle()
					: msg.auth_2fa_setup_subtitle()}
				titleTone="secondary"
			>
				{#snippet leading()}
					<div class="rounded-box bg-secondary/10 p-2">
						<LucideShield className="size-5 text-secondary" />
					</div>
				{/snippet}

				<fieldset class="fieldset">
					<label class="label" for="2fa-setup-password">
						<span class="label-text">
							{m.password()}<span
								class="align-top text-sm leading-none text-error"
								aria-hidden="true">*</span
							>
						</span>
					</label>
					<WashInputField
						id="2fa-setup-password"
						inputType="password"
						bind:value={password}
						className="w-full"
						required
					/>
				</fieldset>

				{#snippet actions()}
					<WashButton
						type="submit"
						className="btn-primary w-full"
						loading={isLoading}
						loadingText={m.loading()}
					>
						{msg.auth_2fa_setup_continue()}
					</WashButton>
					<a
						class="link link-secondary cursor-pointer text-center text-sm"
						href={WebRoutesEnum.MEDORA_HOSPITAL}
					>
						{m.cancel()}
					</a>
				{/snippet}
			</AuthTemplateCard>
		</form>
	{:else if step === 'confirm'}
		<form class="mx-auto w-full max-w-sm" onsubmit={handleConfirm} novalidate>
			<AuthTemplateCard
				title={msg.auth_2fa_setup_scan_title()}
				description={msg.auth_2fa_setup_scan_subtitle()}
				titleTone="primary"
			>
				{#snippet leading()}
					<div class="rounded-box bg-primary/10 p-2">
						<LucideShield className="size-5 text-primary" />
					</div>
				{/snippet}

				{#if qrDataUrl}
					<div class="flex justify-center">
						<img
							src={qrDataUrl}
							alt={msg.auth_2fa_setup_qr_alt()}
							class="rounded-box border border-ink-border bg-base-100 p-2"
							width="220"
							height="220"
						/>
					</div>
				{/if}
				<p class="text-center text-xs text-ink-muted">
					{msg.auth_2fa_account_multi_device_hint()}
				</p>
				{#if manualSecret}
					<p class="text-center text-xs text-ink-muted break-all">
						{msg.auth_2fa_setup_manual_secret({ secret: manualSecret })}
					</p>
				{/if}

				<fieldset class="fieldset">
					<label class="label" for="2fa-setup-code">
						<span class="label-text">
							{msg.auth_2fa_code_label()}<span
								class="align-top text-sm leading-none text-error"
								aria-hidden="true">*</span
							>
						</span>
					</label>
					<div class="overflow-x-auto pb-1">
						<WashOtp
							id="2fa-setup-code"
							bind:value={code}
							ariaLabel={msg.auth_2fa_code_label()}
							required
						/>
					</div>
				</fieldset>

				{#snippet actions()}
					<WashButton
						type="submit"
						className="btn-primary w-full"
						loading={isLoading}
						loadingText={m.loading()}
					>
						{msg.auth_2fa_setup_confirm()}
					</WashButton>
				{/snippet}
			</AuthTemplateCard>
		</form>
	{:else}
		<div class="mx-auto w-full max-w-sm">
			<AuthTemplateCard
				title={msg.auth_2fa_backup_codes_title()}
				description={msg.auth_2fa_backup_codes_subtitle()}
				titleTone="success"
			>
				{#snippet leading()}
					<div class="rounded-box bg-success/10 p-2">
						<LucideShield className="size-5 text-success" />
					</div>
				{/snippet}

				<ul
					class="menu rounded-box w-full border border-ink-border bg-base-100 p-2 font-mono text-sm"
				>
					{#each backupCodes as backup (backup)}
						<li class="px-2 py-1">{backup}</li>
					{/each}
				</ul>

				{#snippet actions()}
					<a
						class="btn btn-primary w-full cursor-pointer"
						href={WebRoutesEnum.MEDORA_HOSPITAL}
					>
						{msg.auth_2fa_setup_done()}
					</a>
				{/snippet}
			</AuthTemplateCard>
		</div>
	{/if}
{/if}
