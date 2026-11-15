<script lang="ts">
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import LucideCheck from '$lib/component/own/library/lucide/LucideCheck.svelte';
	import LucideShieldCheck from '$lib/component/own/library/lucide/LucideShieldCheck.svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import {
		CLOUD_MONTHLY_USD,
		TRIAL_DURATION_OPTIONS,
		formatUsd
	} from '$lib/tool/pricing';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { PricingTier } from '$lib/model/enum/plan.enum';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();
	const EXISTING_USER_CODE = 'existing_user';
	const supportMail = msg.pricing_request_existing_user_mailto();

	let {
		mode = 'trial',
		tier = null,
		submitUrl = '/api/pricing/trial-request',
		showDuration = true,
		pageTitle = m.pricing_trial_title(),
		pageLead = m.pricing_trial_lead(),
		sectionId = 'plan-request',
		headingTag = 'h2'
	}: {
		mode?: 'trial' | 'paid';
		tier?: PricingTier | null;
		submitUrl?: string;
		showDuration?: boolean;
		pageTitle?: string;
		pageLead?: string;
		sectionId?: string;
		headingTag?: 'h1' | 'h2';
	} = $props();

	let submitting = $state(false);
	let sendingOtp = $state(false);
	let duration = $state('7d');
	let emailValue = $state('');
	let otpValue = $state('');
	let otpRequired = $state(false);
	let existingUserBlocked = $state(false);
	let submitted = $state(false);
	let formEl = $state<HTMLFormElement | null>(null);

	const durationLabel = $derived(
		TRIAL_DURATION_OPTIONS.find((o) => o.value === duration)?.label ?? duration
	);

	const summaryTitle = $derived(
		mode === 'trial'
			? msg.pricing_checkout_summary_trial_title()
			: msg.pricing_checkout_summary_paid_title()
	);

	const priceLine = $derived.by(() => {
		if (mode === 'trial') {
			return `${durationLabel} · ${m.pricing_trial_title()}`;
		}
		if (!tier || !(tier in CLOUD_MONTHLY_USD)) return '';
		const usd = CLOUD_MONTHLY_USD[tier as keyof typeof CLOUD_MONTHLY_USD];
		return `$${formatUsd(usd)} / month (cloud)`;
	});

	const summaryBullets = $derived.by((): string[] => {
		if (mode === 'trial') {
			return [
				m.pricing_trial_lead(),
				msg.pricing_checkout_summary_trust()
			];
		}
		if (tier === 'starter') {
			return [
				m.pricing_plan_starter_f1(),
				m.pricing_plan_starter_f2(),
				m.pricing_plan_starter_f3(),
				msg.pricing_checkout_summary_trust()
			];
		}
		if (tier === 'business') {
			return [
				m.pricing_plan_business_f1(),
				m.pricing_plan_business_f2(),
				m.pricing_plan_business_f3(),
				msg.pricing_checkout_summary_trust()
			];
		}
		if (tier === 'scale') {
			return [
				m.pricing_plan_scale_f1(),
				m.pricing_plan_scale_f2(),
				m.pricing_plan_scale_f3(),
				msg.pricing_checkout_summary_trust()
			];
		}
		return [msg.pricing_checkout_summary_trust()];
	});

	const stepIndex = $derived.by(() => {
		if (submitted) return 3;
		if (otpRequired && otpValue.length === 6) return 3;
		if (otpRequired) return 2;
		return 1;
	});

	function onOtpInput(raw: string) {
		otpValue = raw.replace(/\D/g, '').slice(0, 6);
	}

	function handleExistingUserResponse(data: { code?: string }) {
		if (data.code === EXISTING_USER_CODE) {
			existingUserBlocked = true;
			return true;
		}
		return false;
	}

	async function sendOtp() {
		const email = emailValue.trim().toLowerCase();
		existingUserBlocked = false;
		if (!email.includes('@')) {
			toastService.addToast(m.pricing_trial_error_email(), StatusColorEnum.ERROR);
			return;
		}
		if (sendingOtp) return;
		// Set loading state synchronously so the UI responds immediately.
		sendingOtp = true;
		try {
			const res = await fetch('/api/pricing/trial-otp', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email })
			});
			const data = (await res.json()) as {
				success?: boolean;
				message?: string;
				code?: string;
			};
			if (handleExistingUserResponse(data)) return;
			if (data.success) {
				otpRequired = true;
				toastService.addToast(msg.pricing_trial_otp_sent(), StatusColorEnum.SUCCESS);
			} else {
				toastService.addToast(
					data.message ?? msg.pricing_trial_otp_send_failed(),
					StatusColorEnum.ERROR
				);
			}
		} catch {
			toastService.addToast(m.error_network(), StatusColorEnum.ERROR);
		} finally {
			sendingOtp = false;
		}
	}

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!formEl || submitting || submitted) return;
		existingUserBlocked = false;
		if (otpRequired && otpValue.length !== 6) {
			toastService.addToast(msg.pricing_trial_otp_invalid(), StatusColorEnum.ERROR);
			return;
		}
		submitting = true;
		try {
			const body = new FormData(formEl);
			body.set('otp', otpValue);
			if (tier) body.set('tier', tier);
			const res = await fetch(submitUrl, { method: 'POST', body });
			const data = (await res.json()) as {
				success?: boolean;
				message?: string;
				code?: string;
			};
			if (handleExistingUserResponse(data)) return;
			if (data.success) {
				submitted = true;
			} else {
				toastService.addToast(
					data.message ?? m.error_action_failed(),
					StatusColorEnum.ERROR
				);
			}
		} catch {
			toastService.addToast(m.error_network(), StatusColorEnum.ERROR);
		} finally {
			submitting = false;
		}
	}
</script>

<section
	id={sectionId}
	class="scroll-mt-24 px-4 py-16 sm:px-6"
	aria-labelledby="{sectionId}-heading"
>
	<div class="mx-auto max-w-6xl">
		<div class="grid gap-8 lg:grid-cols-12 lg:items-start">
			<aside
				class="{washRecipes.washPanel} border-base-300 lg:sticky lg:top-24 lg:col-span-5 border p-6 sm:p-8"
			>
				<div class="flex items-center gap-2 text-primary">
					<LucideShieldCheck className="size-5 shrink-0" />
					<span class="text-sm font-medium">{summaryTitle}</span>
				</div>
				{#if tier}
					<p class="text-primary mt-2 text-lg font-semibold capitalize">{tier}</p>
				{/if}
				{#if priceLine}
					<p class="text-ink-muted mt-1 text-sm">{priceLine}</p>
				{/if}
				<ul class="mt-6 space-y-2 text-sm text-base-content/80">
					{#each summaryBullets as bullet, i (i)}
						<li class="flex gap-2">
							<LucideCheck className="text-primary mt-0.5 size-4 shrink-0" />
							<span>{bullet}</span>
						</li>
					{/each}
				</ul>
			</aside>

			<div
				class="{washRecipes.washPanel} border-base-300 lg:col-span-7 border p-6 sm:p-8"
			>
				{#if headingTag === 'h1'}
					<h1
						id="{sectionId}-heading"
						class="text-primary text-2xl font-bold sm:text-3xl"
					>
						{pageTitle}
					</h1>
				{:else}
					<h2
						id="{sectionId}-heading"
						class="text-primary text-2xl font-bold sm:text-3xl"
					>
						{pageTitle}
					</h2>
				{/if}
				<p class="text-ink-muted mt-2 max-w-2xl text-sm sm:text-base">{pageLead}</p>

				<ol
					class="steps steps-vertical mt-6 w-full sm:steps-horizontal"
					aria-label="Request progress"
				>
					<li
						class="step"
						class:step-primary={stepIndex >= 1}
						data-content={stepIndex > 1 ? '✓' : '1'}
					>
						{msg.pricing_checkout_step_details()}
					</li>
					<li
						class="step"
						class:step-primary={stepIndex >= 2}
						data-content={stepIndex > 2 ? '✓' : '2'}
					>
						{msg.pricing_checkout_step_verify()}
					</li>
					<li class="step" class:step-primary={stepIndex >= 3} data-content="3">
						{msg.pricing_checkout_step_submit()}
					</li>
				</ol>

				{#if existingUserBlocked}
					<div
						class="alert alert-warning mt-6"
						role="alert"
						aria-live="polite"
					>
						<span>
							{msg.pricing_request_existing_user()}
							<a
								class="link link-primary font-medium"
								href="mailto:{supportMail}"
							>{supportMail}</a>
						</span>
					</div>
				{/if}

				{#if submitted}
					<div
						class="border-success/30 bg-success/5 mt-8 rounded-box border p-6"
						role="status"
					>
						<h3 class="text-success text-lg font-semibold">
							{msg.pricing_checkout_success_title()}
						</h3>
						<p class="text-ink-muted mt-2 text-sm">
							{msg.pricing_checkout_success_lead()}
						</p>
						<ul class="mt-4 space-y-2 text-sm">
							<li class="flex gap-2">
								<LucideCheck className="text-success size-4 shrink-0" />
								{msg.pricing_checkout_success_item_review()}
							</li>
							<li class="flex gap-2">
								<LucideCheck className="text-success size-4 shrink-0" />
								{msg.pricing_checkout_success_item_email()}
							</li>
						</ul>
					</div>
				{:else}
					<form
						bind:this={formEl}
						class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2"
						novalidate
						onsubmit={onSubmit}
					>
						<label class="form-control flex w-full flex-col" for="{sectionId}-first-name">
							<span class="label-text mb-1">
								{m.pricing_trial_first_name()}<span class="text-error text-sm">*</span>
							</span>
							<input
								id="{sectionId}-first-name"
								name="firstName"
								autocomplete="given-name"
								class="input input-bordered w-full"
								required
							/>
						</label>
						<label class="form-control flex w-full flex-col" for="{sectionId}-last-name">
							<span class="label-text mb-1">
								{m.pricing_trial_last_name()}<span class="text-error text-sm">*</span>
							</span>
							<input
								id="{sectionId}-last-name"
								name="lastName"
								autocomplete="family-name"
								class="input input-bordered w-full"
								required
							/>
						</label>
						<label class="form-control flex w-full flex-col" for="{sectionId}-hospital">
							<span class="label-text mb-1">
								{m.pricing_trial_hospital_name()}<span class="text-error text-sm">*</span>
							</span>
							<input
								id="{sectionId}-hospital"
								name="hospitalName"
								class="input input-bordered w-full"
								required
							/>
						</label>
						<label class="form-control flex w-full flex-col" for="{sectionId}-website">
							<span class="label-text mb-1">{m.pricing_trial_website()}</span>
							<input
								id="{sectionId}-website"
								name="website"
								type="text"
								autocomplete="url"
								class="input input-bordered w-full"
								placeholder="https://"
							/>
						</label>
						<div class="form-control md:col-span-2">
							<span class="label-text mb-1">{m.pricing_trial_email()} *</span>
							<div class="flex flex-col gap-2 sm:flex-row">
								<input
									id="{sectionId}-email"
									name="email"
									type="email"
									autocomplete="email"
									class="input input-bordered min-w-0 flex-1"
									bind:value={emailValue}
									required
								/>
								<button
									type="button"
									class="btn btn-outline shrink-0"
									disabled={sendingOtp}
									aria-busy={sendingOtp || undefined}
									onclick={sendOtp}
								>
									{#if sendingOtp}
										<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
										<span>{msg.pricing_trial_send_otp()}…</span>
									{:else}
										{msg.pricing_trial_send_otp()}
									{/if}
								</button>
							</div>
						</div>
						<label class="form-control" for="{sectionId}-otp">
							<span class="label-text mb-1">{msg.pricing_trial_otp_code()}</span>
							<input
								id="{sectionId}-otp"
								type="text"
								inputmode="numeric"
								autocomplete="one-time-code"
								class="input input-bordered w-full"
								maxlength="6"
								bind:value={otpValue}
								oninput={(e) => onOtpInput(e.currentTarget.value)}
							/>
						</label>
						{#if showDuration}
							<label class="form-control" for="{sectionId}-duration">
								<span class="label-text mb-1">{m.pricing_trial_duration()} *</span>
								<WashSelect
									id="{sectionId}-duration"
									name="duration"
									className="w-full"
									bind:value={duration}
									required
									placeholder={m.pricing_trial_duration_placeholder()}
									options={[...TRIAL_DURATION_OPTIONS]}
								/>
							</label>
						{/if}
						<label class="form-control md:col-span-2" for="{sectionId}-message">
							<span class="label-text mb-1">{m.pricing_trial_message()}</span>
							<textarea
								id="{sectionId}-message"
								name="message"
								rows="3"
								class="textarea textarea-bordered w-full"
								placeholder={m.pricing_trial_message_placeholder()}
							></textarea>
						</label>
						<div class="md:col-span-2">
							<button
								type="submit"
								class="btn btn-primary w-full sm:w-auto"
								class:loading={submitting}
								disabled={submitting}
							>
								{m.pricing_trial_submit()}
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
</section>
