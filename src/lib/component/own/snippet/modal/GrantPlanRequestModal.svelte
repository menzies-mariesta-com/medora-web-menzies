<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { PlanRequestListRow } from '$lib/model/type/plan/owner-entitlement.type';
	import {
		OwnerBillingModeEnum,
		PricingTierEnum
	} from '$lib/model/enum/plan.enum';
	import { PlanRequestKindEnum } from '$lib/model/enum/plan.enum';
	import { TRIAL_DURATION_OPTIONS } from '$lib/tool/pricing';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { redirectIfTwoFactorRequired } from '$lib/util/two-factor-gate.util';

	let {
		confirm,
		cancel,
		request
	}: DialogSlotProps & { request: PlanRequestListRow } = $props();

	const toastService = new ToastService();
	let isSubmitting = $state(false);
	let pricingTier = $state(PricingTierEnum.STARTER);
	let billingMode = $state(OwnerBillingModeEnum.TRIAL);
	let trialDuration = $state('7d');
	let startedLocal = $state('');
	let renewLocal = $state('');

	$effect(() => {
		pricingTier = request.pricingTier ?? PricingTierEnum.STARTER;
		billingMode =
			request.requestKind === PlanRequestKindEnum.PAID
				? OwnerBillingModeEnum.MONTHLY
				: OwnerBillingModeEnum.TRIAL;
		trialDuration = request.trialDuration ?? '7d';
	});

	function defaultStartedLocal(): string {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	$effect(() => {
		if (!startedLocal) startedLocal = defaultStartedLocal();
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting) return;
		const startedAt = new Date(startedLocal).toISOString();
		let renewAt: string | null = null;
		if (billingMode !== OwnerBillingModeEnum.TRIAL) {
			if (!renewLocal) {
				toastService.addToast(
					'Renew date is required for paid plans.',
					StatusColorEnum.ERROR
				);
				return;
			}
			renewAt = new Date(renewLocal).toISOString();
		}
		isSubmitting = true;
		try {
			const res = await fetch('/api/medora/admin/plans/request', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'grant',
					requestId: request.id,
					pricingTier,
					billingMode,
					trialDuration:
						billingMode === OwnerBillingModeEnum.TRIAL
							? trialDuration
							: null,
					startedAt,
					renewAt
				})
			});
			if (!res.ok) {
				if (await redirectIfTwoFactorRequired(res)) return;
				const t = await res.text().catch(() => '');
				throw new Error(t || `Grant failed: ${res.status}`);
			}
			toastService.addToast('Plan granted.', StatusColorEnum.SUCCESS);
			confirm();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Grant failed';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
		<p class="text-sm text-base-content/70">
			{request.firstName} {request.lastName} · {request.email} · {request.hospitalName}
		</p>
		<div class="mt-4 flex flex-col gap-3">
			<label class="form-control w-full" for="grant-tier">
				<span class="label-text mb-1">Pricing tier</span>
				<WashSelect
					id="grant-tier"
					className="w-full"
					bind:value={pricingTier}
					options={[
						{ value: PricingTierEnum.STARTER, label: 'Starter' },
						{ value: PricingTierEnum.BUSINESS, label: 'Business' },
						{ value: PricingTierEnum.SCALE, label: 'Scale' },
						{ value: PricingTierEnum.PLATFORM, label: 'Platform' }
					]}
				/>
			</label>
			<label class="form-control w-full" for="grant-billing">
				<span class="label-text mb-1">Billing mode</span>
				<WashSelect
					id="grant-billing"
					className="w-full"
					bind:value={billingMode}
					options={[
						{ value: OwnerBillingModeEnum.TRIAL, label: 'Trial' },
						{ value: OwnerBillingModeEnum.MONTHLY, label: 'Monthly' },
						{ value: OwnerBillingModeEnum.ANNUAL, label: 'Annual' }
					]}
				/>
			</label>
			{#if billingMode === OwnerBillingModeEnum.TRIAL}
				<label class="form-control w-full" for="grant-duration">
					<span class="label-text mb-1">Trial duration</span>
					<WashSelect
						id="grant-duration"
						className="w-full"
						bind:value={trialDuration}
						options={[...TRIAL_DURATION_OPTIONS]}
					/>
				</label>
			{:else}
				<label class="form-control w-full" for="grant-renew">
					<span class="label-text mb-1">Renew date</span>
					<input
						id="grant-renew"
						type="datetime-local"
						class="input input-bordered w-full"
						bind:value={renewLocal}
						required
					/>
				</label>
			{/if}
			<label class="form-control w-full" for="grant-start">
				<span class="label-text mb-1">Started</span>
				<input
					id="grant-start"
					type="datetime-local"
					class="input input-bordered w-full"
					bind:value={startedLocal}
					required
				/>
			</label>
		</div>
	</div>
	<WashDialogFooter>
		<WashButton type="button" className="btn-ghost" onClick={cancel}>Cancel</WashButton>
		<WashButton type="submit" className="btn-primary" loading={isSubmitting} disabled={isSubmitting}>
			Grant
		</WashButton>
	</WashDialogFooter>
</form>
