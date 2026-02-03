<script lang="ts">
	import { goto } from '$app/navigation';
	import DaisyUiAvatar from '$lib/component/library/daisyui/avatar/DaisyUiAvatar.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiFieldset from '$lib/component/library/daisyui/fieldset/DaisyUiFieldset.svelte';
	import DaisyUiFieldsetLegend from '$lib/component/library/daisyui/fieldset/legend/DaisyUiFieldsetLegend.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/library/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLink from '$lib/component/library/daisyui/link/DaisyUiLink.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/library/lucide/LucideEyeOff.svelte';
	import { authClient } from '$lib/auth-client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { getCountry } from '$lib/remote/table/master-table/country.remote';
	import { getGender } from '$lib/remote/table/master-table/gender.remote';
	import { PasswordTool } from '$lib/tool/password.tool.svelte';
	import { createStaff } from '$lib/remote/table/information-table/staff.remote';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';

	const passwordTool = new PasswordTool();

	let countryData = await getCountry();
	let genderData = await getGender();

	let selectedCountryId = $state('');
	let selectedGenderId = $state('');
	let isPasswordVisible = $state(false);
	let isLoading = $state(false);
	let errorMessage = $state('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const fd = new FormData(form);
		const firstName = (fd.get('firstName') as string)?.trim();
		const middleName = (fd.get('middleName') as string)?.trim();
		const lastName = (fd.get('lastName') as string)?.trim();
		const email = (fd.get('email') as string)?.trim();
		const password = fd.get('password') as string;
		const confirmPassword = fd.get('confirmPassword') as string;

		const name = [firstName, middleName, lastName].filter(Boolean).join(' ') || firstName || email;

		if (!email || !password) {
			errorMessage = 'Email and password are required.';
			return;
		}
		if (password.length < 8) {
			errorMessage = 'Password must be at least 8 characters.';
			return;
		}
		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match.';
			return;
		}

		errorMessage = '';
		isLoading = true;
		const { data, error } = await authClient.signUp.email({
			name: name || email,
			email,
			password,
			callbackURL: WebRoutesEnum.DEFAULT
		});
		if (error) {
			isLoading = false;
			errorMessage = error.message ?? 'Sign up failed. Please try again.';
			return;
		}
		// Create staff profile linked to the new user (1:1) via remote
		if (data?.user) {
			try {
				await createStaff({
					userId: data.user.id,
					firstName,
					middleName,
					lastName,
					email,
					countryId: selectedCountryId || undefined,
					genderId: selectedGenderId || undefined,
					phonePrimary: (fd.get('phonePrimary') as string) || undefined
				});
			} catch (err) {
				errorMessage =
					err instanceof Error ? err.message : 'Profile could not be created.';
				isLoading = false;
				return;
			}
		}
		isLoading = false;
		if (data) {
			await goto(WebRoutesEnum.DEFAULT);
		}
	}
</script>

<DaisyUiCard className="w-full max-w-md">
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
			<!-- first name -->
			<section id="first-name-input">
				<DaisyUiInputField
					inputType="text"
					inputPlaceholderText="First Name"
					className="w-full"
				/>
			</section>

				<!-- first name -->
				<section id="first-name-input">
					<DaisyUiInputField
						inputType="text"
						inputPlaceholderText="First Name"
						nameText="firstName"
						className="w-full"
					/>
				</section>

				<!-- middle name -->
				<section id="middle-name-input">
					<DaisyUiInputField
						inputType="text"
						inputPlaceholderText="Middle Name"
						nameText="middleName"
						className="w-full"
					/>
				</section>

				<!-- last name -->
				<section id="last-name-input">
					<DaisyUiInputField
						inputType="text"
						inputPlaceholderText="Last Name"
						nameText="lastName"
						className="w-full"
					/>
				</section>

			<!-- Country -->
			<section id="country-input">
				<DaisyUiSelect
					bind:value={selectedCountryId}
					optionHeader="Select a Country ..."
					className="bg-base-200"
				>
					{#each countryData as data}
						<option value={String(data.id)} class="gap-5">
							<DaisyUiAvatar
								src={data.imgUrl}
								alt={data.name}
								className="w-5"
							/>
							{data.name}
							[ {data.code.toUpperCase()} ]
						</option>
					{/each}
				</DaisyUiSelect>
			</section>

			<!-- phone number -->
			<section id="phone-number-input">
				<DaisyUiJoin>
					<DaisyUiSelect
						bind:value={selectedCountryId}
						className="max-w-20 bg-base-200"
						optionHeader="Select a Country code"
					>
						{#each countryData as data}
							<option value={String(data.id)} class="gap-5">
								{data.countryCallingCode}
							</option>
						{/each}
					</DaisyUiSelect>
					<DaisyUiInputField
						inputType="text"
						inputPlaceholderText="Phone Number ( Primary )"
						nameText="phonePrimary"
						className="w-full"
					/>
				</DaisyUiJoin>
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

			<!-- Gender -->
			<section id="gender-type-input">
				<DaisyUiSelect
					bind:value={selectedGenderId}
					optionHeader="Select Gender ..."
					className="bg-base-200"
				>
					{#each genderData as data}
						<option value={String(data.id)} class="gap-5">
							{data.name}
						</option>
					{/each}
				</DaisyUiSelect>
			</section>

				<!-- password -->
				<section id="password">
					<DaisyUiJoin className="w-full">
						<DaisyUiInputField
							inputType={isPasswordVisible ? 'text' : 'password'}
							inputPlaceholderText="Password"
							nameText="password"
						/>
						<DaisyUiButton
							type="button"
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
						nameText="confirmPassword"
					/>
				</section>

				<!-- sign up button -->
				<DaisyUiButton
					type="submit"
					className="d-btn-primary w-full"
					disabled={isLoading}
				>
					{isLoading ? 'Signing up…' : 'Sign Up'}
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
		</form>
	</DaisyUiCardBody>
</DaisyUiCard>
