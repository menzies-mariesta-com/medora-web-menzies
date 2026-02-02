<script>
	import DaisyUiAvatar from '$lib/component/library/daisyui/avatar/DaisyUiAvatar.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCheckbox from '$lib/component/library/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiFieldset from '$lib/component/library/daisyui/fieldset/DaisyUiFieldset.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/library/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiLink from '$lib/component/library/daisyui/link/DaisyUiLink.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/library/lucide/LucideEyeOff.svelte';
	import { CountryCodeData } from '$lib/model/data/country-code.data';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { PasswordTool } from '$lib/tool/password.tool.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';

	const passwordTool = new PasswordTool();

	let isPasswordVisible = $state(false);
	
</script>

<DaisyUiCard className="w-full max-w-md">
	<DaisyUiCardBody>
		<DaisyUiFieldset
			fieldsetLegend="SIGN UP"
			fieldsetLegendClassName="my-ft-h1"
			className="bg-base-200 border-base-300 rounded-box w-full border p-6 gap-5"
		>
			<!-- first name -->
			<section id="first-name-input">
				<DaisyUiInputField
					inputType="text"
					inputPlaceholderText="First Name"
					className="w-full"
				/>
			</section>

			<!-- last name -->
			<section id="middle-name-input">
				<DaisyUiInputField
					inputType="text"
					inputPlaceholderText="Middle Name"
					className="w-full"
				/>
			</section>

			<!-- end name -->
			<section id="last-name-input">
				<DaisyUiInputField
					inputType="text"
					inputPlaceholderText="Last Name"
					className="w-full"
				/>
			</section>

			<!-- Region -->
			<section id="last-name-input">
				<DaisyUiSelect
					optionHeader="Select a Region ..."
					className="bg-base-200"
				>
					{#each CountryCodeData as data}
						<option class="gap-5">
							<DaisyUiAvatar
								src={data.image}
								alt={data.name}
								className="w-5"
							/>
							{StringUtil.countryName(data.name)}
							[ {data.code.toUpperCase()} ]
						</option>
					{/each}
				</DaisyUiSelect>
			</section>

			<!-- phone number -->
			<section id="phone-number-input">
				<DaisyUiJoin>
					<DaisyUiSelect
						className="max-w-20 bg-base-200"
						optionHeader="Select a Country code"
					>
						{#each CountryCodeData as data}
							<option class="gap-5">
								{data.phone}
							</option>
						{/each}
					</DaisyUiSelect>
					<DaisyUiInputField
						inputType="text"
						inputPlaceholderText="Phone Number ( Primary )"
						className="w-full"
					/>
				</DaisyUiJoin>
			</section>

			<!-- email -->
			<section id="email-input">
				<DaisyUiInputField
					inputType="email"
					inputPlaceholderText="Email"
					className="w-full"
				/>
			</section>

			<!-- gender -->
			<DaisyUiFieldset
				fieldsetLegend="Gender"
				className="border-base-300 rounded-box w-full border p-4"
			>
				<section
					id="gender-check"
					class="flex items-center justify-between align-middle"
				>
					<div class="flex items-center gap-3">
						<DaisyUiCheckbox />
						<DaisyUiLabel forText="male">Male</DaisyUiLabel>
					</div>
					<div class="flex items-center gap-3">
						<DaisyUiCheckbox />
						<DaisyUiLabel forText="female">Female</DaisyUiLabel>
					</div>
					<div class="flex items-center gap-3">
						<DaisyUiCheckbox />
						<DaisyUiLabel forText="other">Other</DaisyUiLabel>
					</div>
				</section>
			</DaisyUiFieldset>

			<!-- password -->
			<section id="password">
				<DaisyUiJoin className="w-full">
					<DaisyUiInputField
						inputType={isPasswordVisible ? 'text' : 'password'}
						inputPlaceholderText="Password"
					/>
					<DaisyUiButton
						onClick={() =>
							(isPasswordVisible =
								passwordTool.toggleVisibility(isPasswordVisible))}
					>
						{#if isPasswordVisible}
							<LucideEye />
						{:else}
							<LucideEyeOff />
						{/if}
					</DaisyUiButton>
				</DaisyUiJoin>
			</section>

			<!-- confirm password -->
			<section id="confirm-password">
				<DaisyUiInputField
					inputType="password"
					inputPlaceholderText="Confirm Password"
				/>
			</section>

			<!-- sign up button -->
			<DaisyUiButton
				onClick={() => console.log('Login clicked')}
				className="d-btn-primary w-full"
			>
				Sign Up
			</DaisyUiButton>

			<!-- external links -->
			<div class="my-ft-small flex flex-col gap-3">
				<div id="login">
					already have an account? <DaisyUiLink
						href={WebRoutesEnum.LOGIN}
						className="d-link-info">Login</DaisyUiLink
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
