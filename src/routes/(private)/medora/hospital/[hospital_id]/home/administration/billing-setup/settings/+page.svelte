<script lang="ts">
	import IpdAccommodationBillingPolicyPanel from '$lib/component/own/local/private/medora/billing/IpdAccommodationBillingPolicyPanel.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import { BillingVisitOpenModeEnum } from '$lib/model/enum/billing-visit-open-mode.enum';
	import type { HospitalBillingSettingResponse } from '$lib/model/type/medora/billing-context.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import {
		labelForServiceItemId,
		searchServiceItemOptions
	} from '$lib/tool/medora/service-item-search-select.util';
	import { paraglideMsg } from '$lib/util/paraglide-msg.util';
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
	let pharmacyBillingServiceItemId = $state('');
	let serviceItemLabelCache = $state('');
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
				if (cancelled || !data) return;
				if (data.visitOpenMode != null) {
					visitOpenMode = data.visitOpenMode;
				}
				pharmacyBillingServiceItemId =
					data.pharmacyBillingServiceItemId != null
						? String(data.pharmacyBillingServiceItemId)
						: '';
				if (
					data.pharmacyBillingServiceItemId != null &&
					data.pharmacyBillingServiceName
				) {
					serviceItemLabelCache = data.pharmacyBillingServiceName;
				} else {
					serviceItemLabelCache = '';
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

	async function searchServiceItems(query: string) {
		return searchServiceItemOptions(hospitalId, query);
	}

	async function labelForServiceItem(value: string): Promise<string> {
		return labelForServiceItemId({
			hospitalId,
			value,
			cached: serviceItemLabelCache
				? {
						id: pharmacyBillingServiceItemId,
						label: serviceItemLabelCache
					}
				: null
		});
	}

	async function save() {
		if (!api || isSaving) return;
		isSaving = true;
		try {
			const res = await fetch(api, {
				method: 'PATCH',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					visitOpenMode,
					pharmacyBillingServiceItemId:
						pharmacyBillingServiceItemId.trim() === ''
							? null
							: Number(pharmacyBillingServiceItemId)
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			const data = (await res.json()) as HospitalBillingSettingResponse;
			visitOpenMode = data.visitOpenMode;
			pharmacyBillingServiceItemId =
				data.pharmacyBillingServiceItemId != null
					? String(data.pharmacyBillingServiceItemId)
					: '';
			if (
				data.pharmacyBillingServiceItemId != null &&
				data.pharmacyBillingServiceName
			) {
				serviceItemLabelCache = data.pharmacyBillingServiceName;
			}
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

			<div class="divider my-6"></div>

			<h3 class="mb-1 text-base font-semibold">
				{paraglideMsg(
					'billing_settings_pharmacy_title',
					'In-house pharmacy (medication orders)'
				)}
			</h3>
			<p class="mb-4 text-sm text-base-content/70">
				{paraglideMsg(
					'billing_settings_pharmacy_blurb',
					'Medication order lines on OP and IP bills use this service item for bill category grouping.'
				)}
			</p>
			<label class="form-control w-full max-w-xl">
				<span class="label-text mb-1 text-sm">
					{paraglideMsg(
						'billing_settings_pharmacy_service',
						'Pharmacy service item'
					)}
				</span>
				<WashSearchSelect
					className="w-full"
					placeholder={paraglideMsg(
						'billing_settings_pharmacy_service_ph',
						'Search service item…'
					)}
					bind:value={pharmacyBillingServiceItemId}
					searchFn={searchServiceItems}
					getLabelForValue={labelForServiceItem}
					minSearchLength={0}
				/>
				<span class="mt-1 text-xs text-base-content/60">
					{paraglideMsg(
						'billing_settings_pharmacy_service_hint',
						'Choose a service under Pharmacy Supply for correct bill grouping.'
					)}
				</span>
			</label>

			<div class="mt-6">
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

<IpdAccommodationBillingPolicyPanel careSetting="IP" />
<IpdAccommodationBillingPolicyPanel careSetting="ED" />
