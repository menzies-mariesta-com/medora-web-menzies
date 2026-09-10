<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashOtp from '$lib/component/wash/otp/WashOtp.svelte';
	import LucideMail from '$lib/component/own/library/lucide/LucideMail.svelte';
	import AuthTemplateCard from '$lib/component/own/local/public/auth/shared/AuthTemplateCard.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { toastError, toastSuccess } from '$lib/util/toast-copy.util';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Menzies Design OTP template (Templates → Auth → OTP) wired to better-auth emailOTP.
	 */
	const toastService = new ToastService();
	const msg = m as unknown as Record<
		string,
		(inputs?: Record<string, string>) => string
	>;

	const email = $derived(
		page.url.searchParams.get('email')?.trim() || ''
	);
	const emailHint = $derived(
		email || msg.auth_otp_placeholder_email()
	);

	let code = $state('');
	let isLoading = $state(false);
	let isResending = $state(false);
	let resendSeconds = $state(30);

	$effect(() => {
		if (resendSeconds <= 0) return;
		const id = setInterval(() => {
			resendSeconds = Math.max(0, resendSeconds - 1);
		}, 1000);
		return () => clearInterval(id);
	});

	async function handleVerify(e: SubmitEvent) {
		e.preventDefault();
		if (!email) {
			toastService.addToast(
				msg.auth_otp_email_missing(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (code.length < 6) {
			toastService.addToast(m.toast_code_required(), StatusColorEnum.ERROR);
			return;
		}
		isLoading = true;
		try {
			const { error } = await authClient.emailOtp.verifyEmail({
				email,
				otp: code
			});
			if (error) {
				toastError(
					toastService,
					msg.auth_otp_title(),
					m.toast_action_failed(),
					error
				);
				return;
			}
			toastSuccess(
				toastService,
				msg.auth_otp_title(),
				msg.auth_otp_verified()
			);
			await goto(WebRoutesEnum.MEDORA_HOSPITAL);
		} finally {
			isLoading = false;
		}
	}

	async function handleResend() {
		if (resendSeconds > 0 || isResending) return;
		if (!email) {
			toastService.addToast(
				msg.auth_otp_email_missing(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isResending = true;
		try {
			const { error } = await authClient.emailOtp.sendVerificationOtp({
				email,
				type: 'email-verification'
			});
			if (error) {
				toastError(
					toastService,
					msg.auth_otp_title(),
					m.toast_action_failed(),
					error
				);
				return;
			}
			resendSeconds = 30;
			toastSuccess(
				toastService,
				msg.auth_otp_title(),
				msg.auth_otp_resent()
			);
		} finally {
			isResending = false;
		}
	}
</script>

<form class="mx-auto w-full max-w-sm" onsubmit={handleVerify} novalidate>
	<AuthTemplateCard
		title={msg.auth_otp_title()}
		description={msg.auth_otp_subtitle({ email: emailHint })}
	>
		{#snippet leading()}
			<div class="rounded-box bg-primary/10 p-2">
				<LucideMail className="size-5 text-primary" />
			</div>
		{/snippet}

		<fieldset class="fieldset">
			<label class="label" for="otp-email-code">
				<span class="label-text">
					{msg.auth_otp_label()}<span
						class="align-top text-sm leading-none text-error"
						aria-hidden="true">*</span
					>
				</span>
			</label>
			<div class="overflow-x-auto pb-1">
				<WashOtp
					id="otp-email-code"
					bind:value={code}
					ariaLabel={msg.auth_otp_label()}
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
				{msg.auth_otp_verify()}
			</WashButton>
			<WashButton
				type="button"
				className="btn-ghost w-full"
				disabled={resendSeconds > 0}
				loading={isResending}
				loadingText={m.loading()}
				onClick={handleResend}
			>
				{resendSeconds > 0
					? msg.auth_otp_resend_in({ seconds: String(resendSeconds) })
					: msg.auth_otp_resend()}
			</WashButton>
			<a
				class="link link-secondary cursor-pointer text-center text-sm"
				href={WebRoutesEnum.SIGNUP}
			>
				{msg.auth_otp_different_email()}
			</a>
		{/snippet}
	</AuthTemplateCard>
</form>
