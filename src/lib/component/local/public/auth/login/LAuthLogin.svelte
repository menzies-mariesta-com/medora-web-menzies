<script>
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiFieldset from '$lib/component/library/daisyui/fieldset/DaisyUiFieldset.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/library/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLink from '$lib/component/library/daisyui/link/DaisyUiLink.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/library/lucide/LucideEyeOff.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

	let isPasswordVisible = $state(false);

	function togglePasswordVisibility() {
		isPasswordVisible = !isPasswordVisible;
	}
</script>

<DaisyUiCard className="w-full max-w-md ">
	<DaisyUiCardBody>
		<DaisyUiFieldset
			fieldsetLegend="LOGIN"
			fieldsetLegendClassName="my-ft-h1"
			className="bg-base-200 border-base-300 rounded-box w-full border p-6 gap-5"
		>
			<!-- username -->
			<section id="username-input">
				<DaisyUiInputField
					inputType="text"
					inputPlaceholderText="Username"
					className="w-full"
				/>
			</section>

			<!-- password -->
			<section id="password">
				<DaisyUiJoin className="w-full">
					<DaisyUiInputField
						inputType={isPasswordVisible ? 'text' : 'password'}
						inputPlaceholderText="Password"
					/>
					<DaisyUiButton onClick={togglePasswordVisibility}>
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
				onClick={() => console.log('Login clicked')}
				className="d-btn-primary w-full"
			>
				Login
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
	</DaisyUiCardBody>
</DaisyUiCard>
