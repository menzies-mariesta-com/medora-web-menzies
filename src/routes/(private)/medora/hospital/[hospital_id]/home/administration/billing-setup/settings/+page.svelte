<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import { BillingVisitOpenModeEnum } from '$lib/model/enum/billing-visit-open-mode.enum';
	import type { HospitalBillingSettingResponse } from '$lib/model/type/medora/billing-context.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/billing-setup/settings`
			: ''
	);

	let visitOpenMode = $state(BillingVisitOpenModeEnum.ONE_VISIT_ONE_BILL);
	let isLoading = $state(false);
	let isSaving = $state(false);

	$effect(() => {
		const url = api;
		if (!url) return;
		let cancelled = false;
		isLoading = true;
		void fetch(url, { credentials: 'include' })
			.then(async (res) => {
				if (!res.ok) await throwUserFacingHttpError(res);
				return (await res.json()) as HospitalBillingSettingResponse;
			})
			.then((data) => {
				if (!cancelled && data?.visitOpenMode != null) {
					visitOpenMode = data.visitOpenMode;
				}
			})
			.catch(() => {
				if (!cancelled) {
					toastService.addToast(
						'Failed to load billing settings',
						StatusColorEnum.ERROR
					);
				}
			})
			.finally(() => {
				if (!cancelled) isLoading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	async function save() {
		if (!api || isSaving) return;
		isSaving = true;
		try {
			const res = await fetch(api, {
				method: 'PATCH',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ visitOpenMode })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			const data = (await res.json()) as HospitalBillingSettingResponse;
			visitOpenMode = data.visitOpenMode;
			toastService.addToast(
				msg.billing_settings_saved?.() ?? 'Billing settings saved',
				StatusColorEnum.SUCCESS
			);
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Save failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isSaving = false;
		}
	}
</script>

<WashCard>
	<WashCardBody>
		<WashCardBodyTitle>
			{msg.billing_settings_title?.() ?? 'Billing settings'}
		</WashCardBodyTitle>
		{#if isLoading}
			<p class="text-sm text-base-content/70">Loading…</p>
		{:else}
			<fieldset class="space-y-3">
				<legend class="text-sm font-medium">
					{msg.billing_settings_visit_open_mode?.() ??
						'Visit open policy'}
				</legend>
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="radio"
						class="radio radio-primary mt-1"
						name="visitOpenMode"
						value={BillingVisitOpenModeEnum.ONE_VISIT_ONE_BILL}
						checked={visitOpenMode ===
							BillingVisitOpenModeEnum.ONE_VISIT_ONE_BILL}
						onchange={() =>
							(visitOpenMode =
								BillingVisitOpenModeEnum.ONE_VISIT_ONE_BILL)}
					/>
					<span>
						<span class="font-medium">
							{msg.billing_settings_one_visit_one_bill?.() ??
								'One visit one bill'}
						</span>
						<span class="mt-0.5 block text-sm text-base-content/70">
							{msg.billing_settings_one_visit_one_bill_help?.() ??
								''}
						</span>
					</span>
				</label>
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="radio"
						class="radio radio-primary mt-1"
						name="visitOpenMode"
						value={BillingVisitOpenModeEnum.MULTIPLE_VISIT_ONE_BILL}
						checked={visitOpenMode ===
							BillingVisitOpenModeEnum.MULTIPLE_VISIT_ONE_BILL}
						onchange={() =>
							(visitOpenMode =
								BillingVisitOpenModeEnum.MULTIPLE_VISIT_ONE_BILL)}
					/>
					<span>
						<span class="font-medium">
							{msg.billing_settings_multiple_visit_one_bill?.() ??
								'Multiple visit one bill'}
						</span>
						<span class="mt-0.5 block text-sm text-base-content/70">
							{msg.billing_settings_multiple_visit_one_bill_help?.() ??
								''}
						</span>
					</span>
				</label>
			</fieldset>
			<div class="mt-4">
				<WashButton
					className="btn-primary btn-sm"
					disabled={isSaving}
					onClick={() => void save()}
				>
					Save
				</WashButton>
			</div>
		{/if}
	</WashCardBody>
</WashCard>
