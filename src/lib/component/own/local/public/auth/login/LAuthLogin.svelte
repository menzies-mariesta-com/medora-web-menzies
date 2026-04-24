<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiFieldset from '$lib/component/daisyui/fieldset/DaisyUiFieldset.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLink from '$lib/component/daisyui/link/DaisyUiLink.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/own/library/lucide/LucideEyeOff.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import DaisyUiFieldsetLegend from '$lib/component/daisyui/fieldset/legend/DaisyUiFieldsetLegend.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { toastError } from '$lib/util/toast-copy.util';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import ResetPasswordModal from '$lib/component/own/snippet/modal/ResetPasswordModal.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();

	function sanitizeRedirectTo(redirectTo: string | null) {
		if (!redirectTo) return WebRoutesEnum.HEKA_HOSPITAL;
		const value = redirectTo.trim();
		const lower = value.toLowerCase();

		if (!value.startsWith('/')) return WebRoutesEnum.HEKA_HOSPITAL;
		if (value.startsWith('//')) return WebRoutesEnum.HEKA_HOSPITAL;
		if (lower.startsWith('http:') || lower.startsWith('https:'))
			return WebRoutesEnum.HEKA_HOSPITAL;

		return value;
	}

	let redirectTarget = $derived(
		sanitizeRedirectTo(page.url.searchParams.get('redirectTo'))
	);

	function openResetPasswordModal() {
		dialogService.open({
			component: ResetPasswordModal
		});
	}

	let isPasswordVisible = $state(false);
	let isLoading = $state(false);

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
		const { data, error } = await authClient.signIn.email({
			email,
			password,
			callbackURL: redirectTarget
		});
		isLoading = false;

		if (error) {
			toastError(
				toastService,
				m.login(),
				m.toast_action_failed(),
				error
			);
			return;
		}
		if (data) {
			await goto(redirectTarget);
		}
	}
</script>

<DaisyUiCard className="w-full max-w-md ">
	<DaisyUiCardBody>
		<form onsubmit={handleSubmit}>
			<DaisyUiFieldset
				className="bg-base-200 border-base-300 rounded-box w-full border p-6 gap-5"
			>
				<DaisyUiFieldsetLegend>
					<DaisyUiLink className="" href={WebRoutesEnum.DEFAULT}>
						<img src={HekaLogo} alt="" class="w-42" />
					</DaisyUiLink>
				</DaisyUiFieldsetLegend>

				<!-- email -->
				<section id="email-input">
					<DaisyUiInputField
						inputType="email"
						inputPlaceholderText={m.email()}
						nameText="email"
						className="w-full"
					/>
				</section>

				<!-- password -->
				<section id="password">
					<DaisyUiJoin className="w-full">
						<DaisyUiInputField
							inputType={isPasswordVisible ? 'text' : 'password'}
							inputPlaceholderText={m.password()}
							nameText="password"
							className="d-join-item"
						/>
						<DaisyUiButton
							className="d-join-item"
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

				<!-- login button -->
				<DaisyUiButton
					type="submit"
					className="d-btn-primary w-full"
					loading={isLoading}
					loadingText={m.signing_in()}
				>
					{m.login()}
				</DaisyUiButton>

				<!-- external links -->
				<div class="my-ft-small flex flex-col gap-3">
					<div id="signup">
						{m.no_account()}
						<DaisyUiLink
							href={WebRoutesEnum.SIGNUP}
							className="d-link-info">{m.signup()}</DaisyUiLink
						>
					</div>
					<div id="forget-password">
						{m.forget_password()}
						<DaisyUiLink
							onClick={openResetPasswordModal}
							className="d-link-info"
						>
							{m.reset_password()}
						</DaisyUiLink>
					</div>
				</div>
			</DaisyUiFieldset>
		</form>
	</DaisyUiCardBody>
</DaisyUiCard>
