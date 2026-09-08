<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashOtp from '$lib/component/wash/otp/WashOtp.svelte';
	import LucideMail from '$lib/component/own/library/lucide/LucideMail.svelte';
	import AuthTemplateCard from '$lib/component/own/local/public/auth/shared/AuthTemplateCard.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Menzies Design OTP template shell (Templates → Auth → OTP).
	 * Wire to better-auth email verification when enabled.
	 */
	const toastService = new ToastService();
	const msg = m as Record<string, (inputs?: Record<string, string>) => string>;

	const emailHint = $derived(
		page.url.searchParams.get('email')?.trim() ||
			msg.auth_otp_placeholder_email()
	);

	let code = $state('');
	let isLoading = $state(false);
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
		if (code.length < 6) {
			toastService.addToast(m.toast_code_required(), StatusColorEnum.ERROR);
			return;
		}
		isLoading = true;
		try {
			toastService.addToast(
				msg.auth_otp_ui_only(),
				StatusColorEnum.INFO
			);
		} finally {
			isLoading = false;
		}
	}

	function handleResend() {
		if (resendSeconds > 0) return;
		resendSeconds = 30;
		toastService.addToast(m.reset_email_sent(), StatusColorEnum.INFO);
	}
</script>

<form class="mx-auto w-full max-w-sm" onsubmit={handleVerify}>
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
			<WashOtp
				id="otp-email-code"
				bind:value={code}
				ariaLabel={msg.auth_otp_label()}
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
				{msg.auth_otp_verify()}
			</WashButton>
			<p class="text-center text-sm text-ink-muted">
				{#if resendSeconds > 0}
					{msg.auth_otp_resend()} ({resendSeconds}s)
				{:else}
					<button
						type="button"
						class="link link-primary cursor-pointer"
						onclick={handleResend}
					>
						{msg.auth_otp_resend()}
					</button>
				{/if}
			</p>
			<a
				class="link link-secondary cursor-pointer text-center text-sm"
				href={WebRoutesEnum.LOGIN}
			>
				{msg.auth_otp_different_email()}
			</a>
		{/snippet}
	</AuthTemplateCard>
</form>
