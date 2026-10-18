<script lang="ts">
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideCircleX from '$lib/component/own/library/lucide/LucideCircleX.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { TRIAL_DURATION_OPTIONS } from '$lib/tool/pricing';
	import { m } from '$lib/paraglide/messages';

	type FormState = {
		success: boolean;
		message: string;
	} | null;

	let submitting = $state(false);
	let toastGone = $state(false);
	let duration = $state('7d');
	let formResult = $state<FormState>(null);
	let formEl = $state<HTMLFormElement | null>(null);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!formEl || submitting) return;

		submitting = true;
		try {
			const res = await fetch('/api/pricing/trial-request', {
				method: 'POST',
				body: new FormData(formEl)
			});
			const data = (await res.json()) as {
				success?: boolean;
				message?: string;
			};
			formResult = {
				success: Boolean(data.success),
				message: data.message ?? m.error_action_failed()
			};
			if (formResult.success) formEl.reset();
		} catch {
			formResult = {
				success: false,
				message: m.error_network()
			};
		} finally {
			submitting = false;
		}
	}

	$effect(() => {
		if (formResult?.message) toastGone = false;
	});
</script>

<section
	id="request-trial"
	class="scroll-mt-24 px-4 py-16 sm:px-6"
	aria-labelledby="trial-request-heading"
>
	<div class="mx-auto max-w-6xl">
		<div class="{washRecipes.washPanel} border-base-300 w-full border p-6 sm:p-8">
			<h2
				id="trial-request-heading"
				class="card-title text-primary text-2xl font-bold sm:text-3xl"
			>
				{m.pricing_trial_title()}
			</h2>
			<p class="text-ink-muted mt-2 max-w-2xl text-sm sm:text-base">
				{m.pricing_trial_lead()}
			</p>

			{#if formResult?.message && !toastGone}
				<div class="toast toast-end toast-bottom z-[100]">
					<div
						class="alert shadow-lg"
						class:alert-success={formResult.success}
						class:alert-error={!formResult.success}
					>
						{#if formResult.success}
							<LucideCircleCheck className="h-5 w-5 shrink-0" />
						{:else}
							<LucideCircleX className="h-5 w-5 shrink-0" />
						{/if}
						<span>{formResult.message}</span>
						<button
							type="button"
							class="btn btn-ghost btn-xs cursor-pointer"
							onclick={() => (toastGone = true)}
							aria-label={m.toast_dismiss_aria()}
						>
							×
						</button>
					</div>
				</div>
			{/if}

			<form
				bind:this={formEl}
				class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2"
				onsubmit={onSubmit}
			>
				<label class="form-control flex w-full flex-col" for="trial-first-name">
					<span class="label-text mb-1">
						{m.pricing_trial_first_name()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="trial-first-name"
						name="firstName"
						autocomplete="given-name"
						class="input input-bordered w-full cursor-text"
						required
					/>
				</label>

				<label class="form-control flex w-full flex-col" for="trial-last-name">
					<span class="label-text mb-1">
						{m.pricing_trial_last_name()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="trial-last-name"
						name="lastName"
						autocomplete="family-name"
						class="input input-bordered w-full cursor-text"
						required
					/>
				</label>

				<label
					class="form-control flex w-full flex-col md:col-span-2"
					for="trial-hospital-name"
				>
					<span class="label-text mb-1">
						{m.pricing_trial_hospital_name()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="trial-hospital-name"
						name="hospitalName"
						class="input input-bordered w-full cursor-text"
						required
					/>
				</label>

				<label class="form-control flex w-full flex-col" for="trial-website">
					<span class="label-text mb-1">{m.pricing_trial_website()}</span>
					<input
						id="trial-website"
						name="website"
						type="url"
						autocomplete="url"
						class="input input-bordered w-full cursor-text"
						placeholder="https://"
					/>
				</label>

				<label class="form-control flex w-full flex-col" for="trial-email">
					<span class="label-text mb-1">
						{m.pricing_trial_email()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="trial-email"
						name="email"
						type="email"
						autocomplete="email"
						class="input input-bordered w-full cursor-text"
						required
					/>
				</label>

				<label class="form-control flex w-full flex-col" for="trial-duration">
					<span class="label-text mb-1">
						{m.pricing_trial_duration()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<WashSelect
						id="trial-duration"
						name="duration"
						className="w-full cursor-pointer"
						bind:value={duration}
						required
						placeholder={m.pricing_trial_duration_placeholder()}
						options={[...TRIAL_DURATION_OPTIONS]}
					/>
				</label>

				<label
					class="form-control flex w-full flex-col md:col-span-2"
					for="trial-message"
				>
					<span class="label-text mb-1">{m.pricing_trial_message()}</span>
					<textarea
						id="trial-message"
						name="message"
						rows="3"
						class="textarea textarea-bordered w-full cursor-text"
						placeholder={m.pricing_trial_message_placeholder()}
					></textarea>
				</label>

				<div class="md:col-span-2">
					<button
						type="submit"
						class="btn btn-primary cursor-pointer"
						class:cursor-not-allowed={submitting}
						class:btn-disabled={submitting}
						class:loading={submitting}
						disabled={submitting}
						aria-busy={submitting}
					>
						{m.pricing_trial_submit()}
					</button>
				</div>
			</form>
		</div>
	</div>
</section>
