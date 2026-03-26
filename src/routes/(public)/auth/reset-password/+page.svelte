<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiFieldset from '$lib/component/daisyui/fieldset/DaisyUiFieldset.svelte';
	import DaisyUiFieldsetLegend from '$lib/component/daisyui/fieldset/legend/DaisyUiFieldsetLegend.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLink from '$lib/component/daisyui/link/DaisyUiLink.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/own/library/lucide/LucideEyeOff.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();

	const token = $derived(page.url.searchParams.get('token'));
	const errorFromUrl = $derived(page.url.searchParams.get('error'));

	let isPasswordVisible = $state(false);
	let isLoading = $state(false);

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
			toastService.addToast(
				m.please_enter_email(),
				StatusColorEnum.ERROR
			);
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
			toastService.addToast(
				m.password_min_length(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (newPassword !== confirmPassword) {
			toastService.addToast(
				m.passwords_not_match(),
				StatusColorEnum.ERROR
			);
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
		toastService.addToast(
			m.password_reset_success(),
			StatusColorEnum.INFO
		);
		await goto(WebRoutesEnum.LOGIN);
	}

	function togglePasswordVisibility() {
		isPasswordVisible = !isPasswordVisible;
	}
</script>

<DaisyUiCard className="w-full max-w-md">
	<DaisyUiCardBody>
		{#if errorFromUrl === 'INVALID_TOKEN'}
			<div
				class="rounded-box border border-error/30 bg-error/10 p-4 text-error"
			>
				{m.invalid_reset_link()}
			</div>
		{/if}

		{#if token}
			<form onsubmit={handleResetPassword}>
				<DaisyUiFieldset
					className="bg-base-200 border-base-300 rounded-box w-full border p-6 gap-5"
				>
					<DaisyUiFieldsetLegend>
						<DaisyUiLink className="" href={WebRoutesEnum.DEFAULT}>
							<img src={HekaLogo} alt="" class="w-42" />
						</DaisyUiLink>
					</DaisyUiFieldsetLegend>
					<p class="text-sm text-base-content/80">
						{m.set_new_password_description()}
					</p>

					<section>
						<DaisyUiJoin className="w-full">
							<DaisyUiInputField
								inputType={isPasswordVisible ? 'text' : 'password'}
								inputPlaceholderText={m.new_password()}
								nameText="newPassword"
								className="w-full"
							/>
							<DaisyUiButton
								type="button"
								onClick={togglePasswordVisibility}
							>
								{#if isPasswordVisible}
									<LucideEye />
								{:else}
									<LucideEyeOff />
								{/if}
							</DaisyUiButton>
						</DaisyUiJoin>
					</section>
					<section>
						<DaisyUiInputField
							inputType="password"
							inputPlaceholderText={m.confirm_new_password()}
							nameText="confirmPassword"
							className="w-full"
						/>
					</section>

					<DaisyUiButton
						type="submit"
						className="d-btn-primary w-full"
						loading={isLoading}
						loadingText={m.resetting()}
					>
						{m.reset_password()}
					</DaisyUiButton>
				</DaisyUiFieldset>
			</form>
		{:else}
			<form onsubmit={handleRequestReset}>
				<DaisyUiFieldset
					className="bg-base-200 border-base-300 rounded-box w-full border p-6 gap-5"
				>
					<DaisyUiFieldsetLegend>
						<DaisyUiLink className="" href={WebRoutesEnum.DEFAULT}>
							<img src={HekaLogo} alt="" class="w-42" />
						</DaisyUiLink>
					</DaisyUiFieldsetLegend>
					<p class="text-sm text-base-content/80">
						{m.enter_email_reset_description()}
					</p>

					<section>
						<DaisyUiInputField
							inputType="email"
							inputPlaceholderText={m.email()}
							nameText="email"
							className="w-full"
						/>
					</section>

					<DaisyUiButton
						type="submit"
						className="d-btn-primary w-full"
						loading={isLoading}
						loadingText={m.sending()}
					>
						{m.send_reset_link()}
					</DaisyUiButton>

					<div class="my-ft-small">
						<DaisyUiLink
							href={WebRoutesEnum.LOGIN}
							className="d-link-info"
						>
							{m.back_to_login()}
						</DaisyUiLink>
					</div>
				</DaisyUiFieldset>
			</form>
		{/if}
	</DaisyUiCardBody>
</DaisyUiCard>
