<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/own/library/lucide/LucideEyeOff.svelte';
	import AuthTemplateCard from '$lib/component/own/local/public/auth/shared/AuthTemplateCard.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();
	const msg = m as Record<string, (inputs?: Record<string, string>) => string>;

	const token = $derived(page.url.searchParams.get('token'));
	const errorFromUrl = $derived(page.url.searchParams.get('error'));

	let isPasswordVisible = $state(false);
	let isLoading = $state(false);
	let sentToEmail = $state('');

	function getResetRedirectUrl(): string {
		if (typeof window === 'undefined') return '';
		return `${window.location.origin}${WebRoutesEnum.RESET_PASSWORD}`;
	}

	async function handleRequestReset(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const fd = new FormData(form);
		const email = (fd.get('email') as string)?.trim();
		if (!email) {
			toastService.addToast(m.please_enter_email(), StatusColorEnum.ERROR);
			return;
		}
		isLoading = true;
		const { error } = await authClient.requestPasswordReset({
			email,
			redirectTo: getResetRedirectUrl()
		});
		isLoading = false;
		if (error) {
			toastService.addToast(
				error.message ?? m.failed_send_reset_link(),
				StatusColorEnum.ERROR
			);
			return;
		}
		sentToEmail = email;
		toastService.addToast(m.reset_email_sent(), StatusColorEnum.INFO);
	}

	async function handleResetPassword(e: SubmitEvent) {
		e.preventDefault();
		if (!token) return;
		const form = e.currentTarget as HTMLFormElement;
		const fd = new FormData(form);
		const newPassword = fd.get('newPassword') as string;
		const confirmPassword = fd.get('confirmPassword') as string;
		if (!newPassword || newPassword.length < 8) {
			toastService.addToast(m.password_min_length(), StatusColorEnum.ERROR);
			return;
		}
		if (newPassword !== confirmPassword) {
			toastService.addToast(m.passwords_not_match(), StatusColorEnum.ERROR);
			return;
		}
		isLoading = true;
		const { error } = await authClient.resetPassword({
			newPassword,
			token
		});
		isLoading = false;
		if (error) {
			toastService.addToast(
				error.message ?? m.failed_reset_password(),
				StatusColorEnum.ERROR
			);
			return;
		}
		toastService.addToast(m.password_reset_success(), StatusColorEnum.INFO);
		await goto(WebRoutesEnum.LOGIN);
	}

	function togglePasswordVisibility() {
		isPasswordVisible = !isPasswordVisible;
	}
</script>

<div class="mx-auto flex w-full max-w-sm flex-col gap-4">
	{#if errorFromUrl === 'INVALID_TOKEN'}
		<div class="rounded-box border border-error/30 bg-error/10 p-4 text-error">
			{m.invalid_reset_link()}
		</div>
	{/if}

	{#if token}
		<form onsubmit={handleResetPassword}>
			<AuthTemplateCard
				title={msg.auth_set_password_title()}
				description={m.set_new_password_description()}
				titleTone="secondary"
			>
				<fieldset class="fieldset">
					<label class="label" for="reset-password">
						<span class="label-text">{m.new_password()}</span>
					</label>
					<div class="join flex w-full">
						<WashInputField
							id="reset-password"
							inputType={isPasswordVisible ? 'text' : 'password'}
							inputPlaceholderText={m.new_password()}
							nameText="newPassword"
							className="join-item w-full"
							required
						/>
						<WashButton
							type="button"
							className="join-item"
							onClick={togglePasswordVisibility}
						>
							{#if isPasswordVisible}
								<LucideEye />
							{:else}
								<LucideEyeOff />
							{/if}
						</WashButton>
					</div>
					<p class="text-xs text-ink-muted">{msg.auth_set_password_hint()}</p>
				</fieldset>

				<fieldset class="fieldset">
					<label class="label" for="reset-confirm">
						<span class="label-text">{m.confirm_new_password()}</span>
					</label>
					<WashInputField
						id="reset-confirm"
						inputType="password"
						inputPlaceholderText={m.confirm_new_password()}
						nameText="confirmPassword"
						className="w-full"
						required
					/>
				</fieldset>

				{#snippet actions()}
					<WashButton
						type="submit"
						className="btn-primary w-full"
						loading={isLoading}
						loadingText={m.resetting()}
					>
						{m.reset_password()}
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
	{:else if sentToEmail}
		<AuthTemplateCard
			title={msg.auth_check_email_title()}
			description={msg.auth_check_email_body({ email: sentToEmail })}
			titleTone="success"
		>
			{#snippet leading()}
				<div class="rounded-full bg-success/15 p-3">
					<LucideCircleCheck className="size-8 text-success" />
				</div>
			{/snippet}
			{#snippet actions()}
				<p class="text-center text-sm text-ink-muted">
					{m.forget_password()}
					<button
						type="button"
						class="link link-primary cursor-pointer"
						onclick={() => (sentToEmail = '')}
					>
						{msg.auth_resend_link()}
					</button>
				</p>
				<a
					class="link link-secondary cursor-pointer text-center text-sm"
					href={WebRoutesEnum.LOGIN}
				>
					{m.back_to_login()}
				</a>
			{/snippet}
		</AuthTemplateCard>
	{:else}
		<form onsubmit={handleRequestReset}>
			<AuthTemplateCard
				title={msg.auth_forgot_title()}
				description={msg.auth_forgot_subtitle()}
			>
				<fieldset class="fieldset">
					<label class="label" for="forgot-email">
						<span class="label-text">{m.email()}</span>
					</label>
					<WashInputField
						id="forgot-email"
						inputType="email"
						inputPlaceholderText={m.email()}
						nameText="email"
						className="w-full"
						required
					/>
				</fieldset>

				{#snippet actions()}
					<WashButton
						type="submit"
						className="btn-primary w-full"
						loading={isLoading}
						loadingText={m.sending()}
					>
						{m.send_reset_link()}
					</WashButton>
					<p class="text-center text-sm text-ink-muted">
						<a class="link link-secondary cursor-pointer" href={WebRoutesEnum.LOGIN}>
							{m.back_to_login()}
						</a>
					</p>
				{/snippet}
			</AuthTemplateCard>
		</form>
	{/if}
</div>
