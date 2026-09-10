<script lang="ts">
	import { goto } from '$app/navigation';
	import WashAvatar from '$lib/component/wash/avatar/WashAvatar.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import MenziesPhoneField from '$lib/component/own/library/menzies/phone/MenziesPhoneField.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/own/library/lucide/LucideEyeOff.svelte';
	import AuthTemplateCard from '$lib/component/own/local/public/auth/shared/AuthTemplateCard.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { PasswordTool } from '$lib/tool/password.tool.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { authClient } from '$lib/auth/client';
	import { m } from '$lib/paraglide/messages';

	const passwordTool = new PasswordTool();
	const toastService = new ToastService();
	const msg = m as Record<string, (inputs?: Record<string, string>) => string>;

	let {
		countries: countryData = [],
		genders: genderData = []
	}: {
		countries?: {
			id: number;
			name: string | null;
			code: string;
			imageUrl?: string | null;
			countryCallingCode?: string | null;
		}[];
		genders?: { id: number; name: string | null }[];
	} = $props();

	let selectedCountryId = $state('');
	let selectedGenderId = $state('');
	let isPasswordVisible = $state(false);
	let isLoading = $state(false);

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
			toastService.addToast(m.first_name_required(), StatusColorEnum.ERROR);
			return;
		}
		if (!lastName) {
			toastService.addToast(m.last_name_required(), StatusColorEnum.ERROR);
			return;
		}
		if (!selectedCountryId) {
			toastService.addToast(m.country_required(), StatusColorEnum.ERROR);
			return;
		}
		if (!phonePrimary) {
			toastService.addToast(m.phone_required(), StatusColorEnum.ERROR);
			return;
		}
		if (!selectedGenderId) {
			toastService.addToast(m.gender_required(), StatusColorEnum.ERROR);
			return;
		}
		if (!email || !password) {
			toastService.addToast(m.email_password_required(), StatusColorEnum.ERROR);
			return;
		}
		if (password.length < 8) {
			toastService.addToast(m.password_min_length(), StatusColorEnum.ERROR);
			return;
		}
		if (password !== confirmPassword) {
			toastService.addToast(m.passwords_not_match(), StatusColorEnum.ERROR);
			return;
		}
		isLoading = true;
		const { data, error } = await authClient.signUp.email({
			name: name || email,
			email,
			password,
			callbackURL: WebRoutesEnum.MEDORA_HOSPITAL
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
			const countryId = selectedCountryId ? Number(selectedCountryId) : undefined;
			const genderId = selectedGenderId ? Number(selectedGenderId) : undefined;

			try {
				const res = await fetch('/api/medora/auth/signup-owner-profile', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						firstName,
						middleName,
						lastName,
						countryId,
						genderId,
						phonePrimary:
							(fd.get('phonePrimary') as string) || undefined
					})
				});
				if (!res.ok) {
					const text = await res.text();
					throw new Error(text || m.profile_create_failed());
				}
			} catch (err) {
				const message =
					err instanceof Error ? err.message : m.profile_create_failed();
				toastService.addToast(message, StatusColorEnum.ERROR);
				isLoading = false;
				return;
			}

			const { error: otpError } =
				await authClient.emailOtp.sendVerificationOtp({
					email,
					type: 'email-verification'
				});
			if (otpError) {
				toastService.addToast(
					otpError.message ?? m.toast_action_failed(),
					StatusColorEnum.ERROR
				);
				isLoading = false;
				return;
			}
		}
		isLoading = false;
		if (data) {
			const next = new URL(
				WebRoutesEnum.EMAIL_VERIFICATION,
				window.location.origin
			);
			next.searchParams.set('email', email);
			await goto(`${next.pathname}${next.search}`);
		}
	}
</script>

<form class="mx-auto w-full max-w-md" onsubmit={handleSubmit}>
	<AuthTemplateCard
		title={msg.auth_create_account_title()}
		description={msg.auth_create_account_subtitle()}
		maxWidthClass="max-w-md"
	>
		<section id="first-name-input">
			<fieldset class="fieldset">
				<label class="label" for="auth-signup-first">
					<span class="label-text">{m.first_name()}</span>
				</label>
				<WashInputField
					id="auth-signup-first"
					inputType="text"
					inputPlaceholderText={m.first_name()}
					nameText="firstName"
					className="w-full"
				/>
			</fieldset>
		</section>

		<section id="middle-name-input">
			<fieldset class="fieldset">
				<label class="label" for="auth-signup-middle">
					<span class="label-text">{m.middle_name()}</span>
				</label>
				<WashInputField
					id="auth-signup-middle"
					inputType="text"
					inputPlaceholderText={m.middle_name()}
					nameText="middleName"
					className="w-full"
				/>
			</fieldset>
		</section>

		<section id="last-name-input">
			<fieldset class="fieldset">
				<label class="label" for="auth-signup-last">
					<span class="label-text">{m.last_name()}</span>
				</label>
				<WashInputField
					id="auth-signup-last"
					inputType="text"
					inputPlaceholderText={m.last_name()}
					nameText="lastName"
					className="w-full"
				/>
			</fieldset>
		</section>

		<section id="country-input">
			<fieldset class="fieldset">
				<label class="label" for="auth-signup-country">
					<span class="label-text">{m.select_country()}</span>
				</label>
				<WashSelect
					id="auth-signup-country"
					bind:value={selectedCountryId}
					optionHeader={m.select_country()}
					className="bg-base-200 w-full"
				>
					{#each countryData as c (c.id)}
						<option value={String(c.id)} class="gap-5">
							<WashAvatar
								src={c.imageUrl ?? undefined}
								alt={c.name ?? undefined}
								className="w-5"
							/>
							{c.name}
							[ {c.code.toUpperCase()} ]
						</option>
					{/each}
				</WashSelect>
			</fieldset>
		</section>

		<section id="phone-number-input">
			<fieldset class="fieldset">
				<label class="label" for="auth-signup-phone">
					<span class="label-text">{m.phone_number_primary()}</span>
				</label>
				<MenziesPhoneField
					id="auth-signup-phone"
					bind:countryId={selectedCountryId}
					countries={countryData}
					optionHeader={m.select_country_code()}
					placeholder={m.phone_number_primary()}
					nameText="phonePrimary"
					selectClassName="bg-base-200"
				/>
			</fieldset>
		</section>

		<section id="email-input">
			<fieldset class="fieldset">
				<label class="label" for="auth-signup-email">
					<span class="label-text">{m.email()}</span>
				</label>
				<WashInputField
					id="auth-signup-email"
					inputType="email"
					inputPlaceholderText={m.email()}
					nameText="email"
					className="w-full"
				/>
			</fieldset>
		</section>

		<section id="gender-type-input">
			<fieldset class="fieldset">
				<label class="label" for="auth-signup-gender">
					<span class="label-text">{m.select_gender()}</span>
				</label>
				<WashSelect
					id="auth-signup-gender"
					bind:value={selectedGenderId}
					optionHeader={m.select_gender()}
					className="bg-base-200 w-full"
				>
					{#each genderData as g (g.id)}
						<option value={String(g.id)} class="gap-5">
							{g.name}
						</option>
					{/each}
				</WashSelect>
			</fieldset>
		</section>

		<div class="grid gap-4 sm:grid-cols-2">
			<section id="password">
				<fieldset class="fieldset">
					<label class="label" for="auth-signup-password">
						<span class="label-text">{m.password()}</span>
					</label>
					<div class="join flex w-full">
						<WashInputField
							id="auth-signup-password"
							inputType={isPasswordVisible ? 'text' : 'password'}
							inputPlaceholderText={m.password()}
							nameText="password"
							className="join-item w-full"
						/>
						<WashButton
							type="button"
							className="join-item"
							onClick={() =>
								(isPasswordVisible =
									passwordTool.toggleVisibility(isPasswordVisible))}
						>
							{#if isPasswordVisible}
								<LucideEye />
							{:else}
								<LucideEyeOff />
							{/if}
						</WashButton>
					</div>
				</fieldset>
			</section>

			<section id="confirm-password">
				<fieldset class="fieldset">
					<label class="label" for="auth-signup-confirm">
						<span class="label-text">{m.confirm_password()}</span>
					</label>
					<WashInputField
						id="auth-signup-confirm"
						inputType="password"
						inputPlaceholderText={m.confirm_password()}
						nameText="confirmPassword"
						className="w-full"
					/>
				</fieldset>
			</section>
		</div>

		{#snippet actions()}
			<WashButton
				type="submit"
				className="btn-primary w-full"
				loading={isLoading}
				loadingText={m.signing_up()}
			>
				{msg.auth_create_account_title()}
			</WashButton>
			<p class="text-center text-sm text-ink-muted">
				{m.already_have_account()}
				<a class="link link-secondary cursor-pointer" href={WebRoutesEnum.LOGIN}>
					{msg.auth_sign_in_title()}
				</a>
			</p>
		{/snippet}
	</AuthTemplateCard>
</form>
