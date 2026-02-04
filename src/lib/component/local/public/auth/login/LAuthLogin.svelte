<script lang="ts">
	import { goto } from '$app/navigation';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiFieldset from '$lib/component/library/daisyui/fieldset/DaisyUiFieldset.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/library/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLink from '$lib/component/library/daisyui/link/DaisyUiLink.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/library/lucide/LucideEyeOff.svelte';
	import { authClient } from '$lib/auth-client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import DaisyUiFieldsetLegend from '$lib/component/library/daisyui/fieldset/legend/DaisyUiFieldsetLegend.svelte';

	let isPasswordVisible = $state(false);
	let isLoading = $state(false);
	let errorMessage = $state('');

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
			errorMessage = 'Email and password are required.';
			return;
		}

		errorMessage = '';
		isLoading = true;
		const { data, error } = await authClient.signIn.email({
			email,
			password,
			callbackURL: WebRoutesEnum.DEFAULT
		});
		isLoading = false;

		if (error) {
			errorMessage = error.message ?? 'Invalid email or password.';
			return;
		}
		if (data) {
			await goto(WebRoutesEnum.DEFAULT);
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
			<!-- username -->
			<section id="username-input">
				<DaisyUiInputField
					inputType="text"
					inputPlaceholderText="Username"
					className="w-full"
				/>
			</section>

				<!-- email -->
				<section id="email-input">
					<DaisyUiInputField
						inputType="email"
						inputPlaceholderText="Email"
						nameText="email"
						className="w-full"
					/>
				</section>

				<!-- password -->
				<section id="password">
					<DaisyUiJoin className="w-full">
						<DaisyUiInputField
							inputType={isPasswordVisible ? 'text' : 'password'}
							inputPlaceholderText="Password"
							nameText="password"
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

				<!-- login button -->
				<DaisyUiButton
					type="submit"
					className="d-btn-primary w-full"
					disabled={isLoading}
				>
					{isLoading ? 'Signing in…' : 'Login'}
				</DaisyUiButton>

			<!-- external links -->
			<div class="my-ft-small flex flex-col gap-3">
				<div id="signup">
					do not have an account? <DaisyUiLink
						href={WebRoutesEnum.SIGNUP}
						className="d-link-info">Signup</DaisyUiLink
					>
				</div>
				<div id="forget-password">
					forget your password? <DaisyUiLink
						href={WebRoutesEnum.FORGET_PASSWORD}
						className="d-link-info"
					>
						Reset Password
					</DaisyUiLink>
				</div>
			</div>
			</DaisyUiFieldset>
		</form>
	</DaisyUiCardBody>
</DaisyUiCard>
