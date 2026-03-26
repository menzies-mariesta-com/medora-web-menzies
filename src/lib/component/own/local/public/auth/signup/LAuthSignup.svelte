<script lang="ts">
	import { goto } from '$app/navigation';
	import DaisyUiAvatar from '$lib/component/daisyui/avatar/DaisyUiAvatar.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiFieldset from '$lib/component/daisyui/fieldset/DaisyUiFieldset.svelte';
	import DaisyUiFieldsetLegend from '$lib/component/daisyui/fieldset/legend/DaisyUiFieldsetLegend.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiJoin from '$lib/component/daisyui/join/DaisyUiJoin.svelte';
	import DaisyUiLink from '$lib/component/daisyui/link/DaisyUiLink.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/own/library/lucide/LucideEyeOff.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { getCountry } from '$lib/tool/remote/table/master-table/country.http.tool.svelte';
	import { getGender } from '$lib/tool/remote/table/master-table/gender.http.tool.svelte';
	import { PasswordTool } from '$lib/tool/password.tool.svelte';
	import { createStaff } from '$lib/tool/remote/table/information-table/staff.http.tool.svelte';
	import { updateUser } from '$lib/tool/remote/table/auth-table/user.http.tool.svelte';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import ResetPasswordModal from '$lib/component/own/snippet/modal/ResetPasswordModal.svelte';
	import { authClient } from '$lib/auth/client';
	import { m } from '$lib/paraglide/messages';

	const passwordTool = new PasswordTool();
	const toastService = new ToastService();

	let countryData: any[] = [];
	let genderData: any[] = [];
	try {
		countryData = await getCountry();
		genderData = await getGender();
	} catch (err) {
		// Avoid crashing SSR on transient DB/network failures.
		console.error('[signup] Failed to load country/gender options', err);
		countryData = [];
		genderData = [];
	}

	let selectedCountryId = $state('');
	let selectedGenderId = $state('');
	let isPasswordVisible = $state(false);
	let isLoading = $state(false);

	function openResetPasswordModal() {
		dialogService.open({
			component: ResetPasswordModal
		});
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const fd = new FormData(form);
		const firstName = (fd.get('firstName') as string)?.trim();
		const middleName = (fd.get('middleName') as string)?.trim();
		const lastName = (fd.get('lastName') as string)?.trim();
		const email = (fd.get('email') as string)?.trim();
		const phonePrimary = (fd.get('phonePrimary') as string)?.trim();
		const password = fd.get('password') as string;
		const confirmPassword = fd.get('confirmPassword') as string;

		const name =
			[firstName, middleName, lastName].filter(Boolean).join(' ') ||
			firstName ||
			email;

		if (!firstName) {
			toastService.addToast(
				m.first_name_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!lastName) {
			toastService.addToast(
				m.last_name_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!selectedCountryId) {
			toastService.addToast(
				m.country_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!phonePrimary) {
			toastService.addToast(
				m.phone_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!selectedGenderId) {
			toastService.addToast(
				m.gender_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!email || !password) {
			toastService.addToast(
				m.email_password_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (password.length < 8) {
			toastService.addToast(
				m.password_min_length(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (password !== confirmPassword) {
			toastService.addToast(
				m.passwords_not_match(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isLoading = true;
		const { data, error } = await authClient.signUp.email({
			name: name || email,
			email,
			password,
			callbackURL: WebRoutesEnum.HEKA_HOSPITAL
		});
		if (error) {
			isLoading = false;
			toastService.addToast(
				error.message ?? m.sign_up_failed(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (data?.user) {
			const countryId = selectedCountryId
				? Number(selectedCountryId)
				: undefined;
			const genderId = selectedGenderId
				? Number(selectedGenderId)
				: undefined;

			try {
				await updateUser({
					id: data.user.id,
					roleId: RoleEnum.OWNER
				});
				await createStaff({
					userId: data.user.id,
					firstName,
					middleName,
					lastName,
					countryId,
					genderId,
					phonePrimary:
						(fd.get('phonePrimary') as string) || undefined
				});
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: m.profile_create_failed();
				toastService.addToast(message, StatusColorEnum.ERROR);
				isLoading = false;
				return;
			}
		}
		isLoading = false;
		if (data) {
			await goto(WebRoutesEnum.HEKA_HOSPITAL);
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
				<section id="first-name-input">
					<DaisyUiInputField
						inputType="text"
						inputPlaceholderText={m.first_name()}
						nameText="firstName"
						className="w-full"
					/>
				</section>

				<section id="middle-name-input">
					<DaisyUiInputField
						inputType="text"
						inputPlaceholderText={m.middle_name()}
						nameText="middleName"
						className="w-full"
					/>
				</section>

				<section id="last-name-input">
					<DaisyUiInputField
						inputType="text"
						inputPlaceholderText={m.last_name()}
						nameText="lastName"
						className="w-full"
					/>
				</section>

				<section id="country-input">
					<DaisyUiSelect
						bind:value={selectedCountryId}
						optionHeader={m.select_country()}
						className="bg-base-200"
					>
						{#each countryData as data}
							<option value={String(data.id)} class="gap-5">
								<DaisyUiAvatar
									src={data.imageUrl}
									alt={data.name}
									className="w-5"
								/>
								{data.name}
								[ {data.code.toUpperCase()} ]
							</option>
						{/each}
					</DaisyUiSelect>
				</section>

				<section id="phone-number-input">
					<DaisyUiJoin>
						<DaisyUiSelect
							bind:value={selectedCountryId}
							className="max-w-20 bg-base-200"
							optionHeader={m.select_country_code()}
						>
							{#each countryData as data}
								<option value={String(data.id)} class="gap-5">
									{data.countryCallingCode}
								</option>
							{/each}
						</DaisyUiSelect>
						<DaisyUiInputField
							inputType="text"
							inputPlaceholderText={m.phone_number_primary()}
							nameText="phonePrimary"
							className="w-full"
						/>
					</DaisyUiJoin>
				</section>

				<section id="email-input">
					<DaisyUiInputField
						inputType="email"
						inputPlaceholderText={m.email()}
						nameText="email"
						className="w-full"
					/>
				</section>

				<section id="gender-type-input">
					<DaisyUiSelect
						bind:value={selectedGenderId}
						optionHeader={m.select_gender()}
						className="bg-base-200"
					>
						{#each genderData as data}
							<option value={String(data.id)} class="gap-5">
								{data.name}
							</option>
						{/each}
					</DaisyUiSelect>
				</section>

				<section id="password">
					<DaisyUiJoin className="w-full">
						<DaisyUiInputField
							inputType={isPasswordVisible ? 'text' : 'password'}
							inputPlaceholderText={m.password()}
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

				<section id="confirm-password">
					<DaisyUiInputField
						inputType="password"
						inputPlaceholderText={m.confirm_password()}
						nameText="confirmPassword"
					/>
				</section>

				<DaisyUiButton
					type="submit"
					className="d-btn-primary w-full"
					disabled={isLoading}
				>
					{isLoading ? m.signing_up() : m.sign_up()}
				</DaisyUiButton>

				<div class="my-ft-small flex flex-col gap-3">
					<div id="login">
						{m.already_have_account()}
						<DaisyUiLink
							href={WebRoutesEnum.LOGIN}
							className="d-link-info">{m.login()}</DaisyUiLink
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
