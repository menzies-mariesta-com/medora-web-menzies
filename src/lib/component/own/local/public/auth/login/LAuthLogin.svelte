<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/own/library/lucide/LucideEyeOff.svelte';
	import AuthSplitHero from '$lib/component/own/local/public/auth/shared/AuthSplitHero.svelte';
	import AuthTemplateCard from '$lib/component/own/local/public/auth/shared/AuthTemplateCard.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { toastError } from '$lib/util/toast-copy.util';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();
	const msg = m as Record<string, (inputs?: Record<string, string>) => string>;

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

	let redirectTarget = $derived(
		sanitizeRedirectTo(page.url.searchParams.get('redirectTo'))
	);

	let isPasswordVisible = $state(false);
	let isLoading = $state(false);
	let rememberMe = $state(true);

	function togglePasswordVisibility() {
		isPasswordVisible = !isPasswordVisible;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const fd = new FormData(form);
		const email = (fd.get('email') as string)?.trim();
		const password = fd.get('password') as string;

		if (!email || !password) {
			toastService.addToast(
				m.email_password_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isLoading = true;
		void rememberMe;
		const { data, error } = await authClient.signIn.email({
			email,
			password,
			callbackURL: redirectTarget
		});
		isLoading = false;

		if (error) {
			toastError(toastService, m.login(), m.toast_action_failed(), error);
			return;
		}
		if (
			data &&
			typeof data === 'object' &&
			'twoFactorRedirect' in data &&
			(data as { twoFactorRedirect?: boolean }).twoFactorRedirect
		) {
			const next = new URL(
				WebRoutesEnum.TWO_FACTOR,
				window.location.origin
			);
			next.searchParams.set('redirectTo', redirectTarget);
			await goto(`${next.pathname}${next.search}`);
			return;
		}
		if (data) {
			await goto(redirectTarget);
		}
	}
</script>

<AuthSplitHero
	headline={msg.auth_welcome_back_title()}
	body={msg.auth_welcome_back_body()}
>
	<form class="w-full" onsubmit={handleSubmit}>
		<AuthTemplateCard
			title={msg.auth_sign_in_title()}
			description={msg.auth_sign_in_subtitle()}
			titleTone="secondary"
		>
			<fieldset class="fieldset">
				<label class="label" for="auth-login-email">
					<span class="label-text">
						{m.email()}<span
							class="align-top text-sm leading-none text-error"
							aria-hidden="true">*</span
						>
					</span>
				</label>
				<WashInputField
					id="auth-login-email"
					inputType="email"
					inputPlaceholderText={m.email()}
					nameText="email"
					className="w-full"
					required
				/>
			</fieldset>

			<fieldset class="fieldset">
				<label class="label" for="auth-login-password">
					<span class="label-text">
						{m.password()}<span
							class="align-top text-sm leading-none text-error"
							aria-hidden="true">*</span
						>
					</span>
				</label>
				<div class="join flex w-full">
					<WashInputField
						id="auth-login-password"
						inputType={isPasswordVisible ? 'text' : 'password'}
						inputPlaceholderText={m.password()}
						nameText="password"
						className="join-item w-full"
						required
					/>
					<WashButton
						className="join-item"
						type="button"
						onClick={togglePasswordVisibility}
					>
						{#if isPasswordVisible}
							<LucideEye />
						{:else}
							<LucideEyeOff />
						{/if}
					</WashButton>
				</div>
			</fieldset>

			<div class="flex items-center justify-between gap-2 text-sm">
				<label class="label cursor-pointer gap-2 py-0" for="auth-remember">
					<WashCheckbox
						id="auth-remember"
						className="checkbox-sm"
						bind:checked={rememberMe}
					/>
					<span class="label-text">{msg.auth_remember_me()}</span>
				</label>
				<a
					class="link link-primary cursor-pointer text-sm"
					href={WebRoutesEnum.RESET_PASSWORD}
				>
					{msg.auth_forgot_password_link()}
				</a>
			</div>

			{#snippet actions()}
				<WashButton
					type="submit"
					className="btn-primary w-full"
					loading={isLoading}
					loadingText={m.signing_in()}
				>
					{msg.auth_sign_in_title()}
				</WashButton>
				<p class="text-center text-sm text-ink-muted">
					{msg.auth_no_account_short()}
					<a class="link link-secondary cursor-pointer" href={WebRoutesEnum.SIGNUP}>
						{msg.auth_create_one()}
					</a>
				</p>
			{/snippet}
		</AuthTemplateCard>
	</form>
</AuthSplitHero>
