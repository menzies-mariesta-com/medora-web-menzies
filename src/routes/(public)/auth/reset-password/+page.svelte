<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiFieldset from '$lib/component/library/daisyui/fieldset/DaisyUiFieldset.svelte';
	import DaisyUiFieldsetLegend from '$lib/component/library/daisyui/fieldset/legend/DaisyUiFieldsetLegend.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/library/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLink from '$lib/component/library/daisyui/link/DaisyUiLink.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/library/lucide/LucideEyeOff.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	const toastService = new ToastService();

	const token = $derived(page.url.searchParams.get('token'));
	const errorFromUrl = $derived(page.url.searchParams.get('error'));

	let isPasswordVisible = $state(false);
	let isLoading = $state(false);

	function getResetRedirectUrl(): string {
		if (typeof window === 'undefined') return '';
		return `${window.location.origin}${WebRoutesEnum.FORGET_PASSWORD}`;
	}

	async function handleRequestReset(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const fd = new FormData(form);
		const email = (fd.get('email') as string)?.trim();
		if (!email) {
			toastService.addToast('Please enter your email.', StatusColorEnum.ERROR);
			return;
		}
		isLoading = true;
		const { error } = await authClient.requestPasswordReset({
			email,
			redirectTo: getResetRedirectUrl()
		});
		isLoading = false;
		if (error) {
			toastService.addToast(error.message ?? 'Failed to send reset link.', StatusColorEnum.ERROR);
			return;
		}
		toastService.addToast(
			'If an account exists for this email, a password reset link has been sent.',
			StatusColorEnum.INFO
		);
	}

	async function handleResetPassword(e: SubmitEvent) {
		e.preventDefault();
		if (!token) return;
		const form = e.currentTarget as HTMLFormElement;
		const fd = new FormData(form);
		const newPassword = fd.get('newPassword') as string;
		const confirmPassword = fd.get('confirmPassword') as string;
		if (!newPassword || newPassword.length < 8) {
			toastService.addToast('Password must be at least 8 characters.', StatusColorEnum.ERROR);
			return;
		}
		if (newPassword !== confirmPassword) {
			toastService.addToast('Passwords do not match.', StatusColorEnum.ERROR);
			return;
		}
		isLoading = true;
		const { error } = await authClient.resetPassword({
			newPassword,
			token
		});
		isLoading = false;
		if (error) {
			toastService.addToast(error.message ?? 'Failed to reset password.', StatusColorEnum.ERROR);
			return;
		}
		toastService.addToast('Password reset successfully. You can now sign in.', StatusColorEnum.INFO);
		await goto(WebRoutesEnum.LOGIN);
	}

	function togglePasswordVisibility() {
		isPasswordVisible = !isPasswordVisible;
	}
</script>

<DaisyUiCard className="w-full max-w-md">
	<DaisyUiCardBody>
		{#if errorFromUrl === 'INVALID_TOKEN'}
			<div class="rounded-box border border-error/30 bg-error/10 p-4 text-error">
				Invalid or expired reset link. Please request a new one below.
			</div>
		{/if}

		{#if token}
			<!-- Set new password (user landed from email link) -->
			<form onsubmit={handleResetPassword}>
				<DaisyUiFieldset
					className="bg-base-200 border-base-300 rounded-box w-full border p-6 gap-5"
				>
					<DaisyUiFieldsetLegend>
						<DaisyUiLink className="" href={WebRoutesEnum.DEFAULT}>
							<img src={HekaLogo} alt="" class="w-42" />
						</DaisyUiLink>
					</DaisyUiFieldsetLegend>
					<p class="text-sm text-base-content/80">Set a new password for your account.</p>

					<section>
						<DaisyUiJoin className="w-full">
							<DaisyUiInputField
								inputType={isPasswordVisible ? 'text' : 'password'}
								inputPlaceholderText="New password"
								nameText="newPassword"
								className="w-full"
							/>
							<DaisyUiButton type="button" onClick={togglePasswordVisibility}>
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
							inputPlaceholderText="Confirm new password"
							nameText="confirmPassword"
							className="w-full"
						/>
					</section>

					<DaisyUiButton
						type="submit"
						className="d-btn-primary w-full"
						disabled={isLoading}
					>
						{isLoading ? 'Resetting…' : 'Reset password'}
					</DaisyUiButton>
				</DaisyUiFieldset>
			</form>
		{:else}
			<!-- Request reset link -->
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
						Enter your email and we’ll send you a link to reset your password.
					</p>

					<section>
						<DaisyUiInputField
							inputType="email"
							inputPlaceholderText="Email"
							nameText="email"
							className="w-full"
						/>
					</section>

					<DaisyUiButton
						type="submit"
						className="d-btn-primary w-full"
						disabled={isLoading}
					>
						{isLoading ? 'Sending…' : 'Send reset link'}
					</DaisyUiButton>

					<div class="my-ft-small">
						<DaisyUiLink href={WebRoutesEnum.LOGIN} className="d-link-info">
							Back to login
						</DaisyUiLink>
					</div>
				</DaisyUiFieldset>
			</form>
		{/if}
	</DaisyUiCardBody>
</DaisyUiCard>
