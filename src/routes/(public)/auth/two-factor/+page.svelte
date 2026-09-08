<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashOtp from '$lib/component/wash/otp/WashOtp.svelte';
	import LucideShield from '$lib/component/own/library/lucide/LucideShield.svelte';
	import AuthTemplateCard from '$lib/component/own/local/public/auth/shared/AuthTemplateCard.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Menzies Design 2FA template shell (Templates → Auth → 2FA).
	 * UI only until authenticator flow is enabled in better-auth.
	 */
	const toastService = new ToastService();
	const msg = m as Record<string, (inputs?: Record<string, string>) => string>;

	let code = $state('');
	let isLoading = $state(false);

	async function handleVerify(e: SubmitEvent) {
		e.preventDefault();
		if (code.length < 6) {
			toastService.addToast(m.toast_code_required(), StatusColorEnum.ERROR);
			return;
		}
		isLoading = true;
		try {
			toastService.addToast(msg.auth_otp_ui_only(), StatusColorEnum.INFO);
		} finally {
			isLoading = false;
		}
	}
</script>

<form class="mx-auto w-full max-w-sm" onsubmit={handleVerify}>
	<AuthTemplateCard
		title={msg.auth_2fa_title()}
		description={msg.auth_2fa_subtitle()}
		titleTone="secondary"
	>
		{#snippet leading()}
			<div class="rounded-box bg-secondary/10 p-2">
				<LucideShield className="size-5 text-secondary" />
			</div>
		{/snippet}

		<fieldset class="fieldset">
			<label class="label" for="otp-2fa-code">
				<span class="label-text">
					{msg.auth_otp_label()}<span
						class="align-top text-sm leading-none text-error"
						aria-hidden="true">*</span
					>
				</span>
			</label>
			<WashOtp
				id="otp-2fa-code"
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
				{msg.auth_2fa_verify()}
			</WashButton>
			<a
				class="link link-secondary cursor-pointer text-center text-sm"
				href={WebRoutesEnum.LOGIN}
			>
				{m.back_to_login()}
			</a>
		{/snippet}
	</AuthTemplateCard>
</form>
