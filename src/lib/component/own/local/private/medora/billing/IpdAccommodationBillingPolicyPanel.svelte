<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import type {
		AccommodationBillingCareSetting,
		AccommodationBillingPolicyRow
	} from '$lib/model/type/medora/ipd/ipd.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import {
		labelForServiceItemId,
		searchServiceItemOptions
	} from '$lib/tool/medora/service-item-search-select.util';
	import {
		labelForTimelineUnitId,
		searchTimelineUnitOptions
	} from '$lib/tool/medora/timeline-unit-search-select.util';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { decimalInputStringFromScale } from '$lib/util/number-display.util';
	import { paraglideMsg } from '$lib/util/paraglide-msg.util';
	import { sanitizeUserFacingErrorText } from '$lib/util/user-facing-error.util';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const DEFAULT_LEAST_BILL_QTY = '1';

	let {
		careSetting = 'IP' as AccommodationBillingCareSetting
	}: {
		careSetting?: AccommodationBillingCareSetting;
	} = $props();

	const toastService = new ToastService();
	const saveLock = createActionLock();
	const isEd = $derived(careSetting === 'ED');
	const billLabel = $derived(isEd ? 'ED' : 'IP');

	function trimmed(value: unknown): string {
		return value == null ? '' : String(value).trim();
	}

	function decimalInput(value: unknown): string {
		return decimalInputStringFromScale(
			value as string | number | null | undefined,
			4
		);
	}

	function leastQtyFromPolicy(value: unknown): string {
		const s = decimalInput(value);
		return s === '' ? DEFAULT_LEAST_BILL_QTY : s;
	}

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/administration/billing-setup/settings/accommodation-policy?careSetting=${encodeURIComponent(careSetting)}`
			: ''
	);

	let loading = $state(true);
	let loadError = $state('');
	let leastBillDuration = $state(DEFAULT_LEAST_BILL_QTY);
	let leastBillDurationUnitId = $state('');
	let billUnitLabelCache = $state('');
	let accommodationServiceItemId = $state('');
	let serviceItemLabelCache = $state('');

	async function loadPolicy() {
		if (!apiBase) return;
		loading = true;
		loadError = '';
		try {
			const res = await fetch(apiBase, { credentials: 'include' });
			if (!res.ok) {
				loadError =
					sanitizeUserFacingErrorText(await res.text(), {
						status: res.status
					}) || paraglideMsg('ip_billing_setup_accommodation_load_failed', 'Failed to load.');
				return;
			}
			const data = (await res.json()) as {
				policy: AccommodationBillingPolicyRow;
				accommodationServiceName?: string | null;
				accommodationBillUnitName?: string | null;
			};
			const p = data.policy;
			leastBillDuration = leastQtyFromPolicy(p.leastBillDuration);
			leastBillDurationUnitId =
				p.accommodationBillUnitId != null
					? String(p.accommodationBillUnitId)
					: '';
			billUnitLabelCache = data.accommodationBillUnitName?.trim() ?? '';
			accommodationServiceItemId =
				p.accommodationServiceItemId != null
					? String(p.accommodationServiceItemId)
					: '';
			if (
				p.accommodationServiceItemId != null &&
				data.accommodationServiceName
			) {
				serviceItemLabelCache = data.accommodationServiceName;
			}
		} catch {
			loadError = paraglideMsg(
				'ip_billing_setup_accommodation_load_failed',
				'Failed to load accommodation policy.'
			);
		} finally {
			loading = false;
		}
	}

	async function searchServiceItems(query: string) {
		return searchServiceItemOptions(hospitalId, query);
	}

	async function labelForServiceItem(value: string): Promise<string> {
		return labelForServiceItemId({
			hospitalId,
			value,
			cached: serviceItemLabelCache
				? { id: accommodationServiceItemId, label: serviceItemLabelCache }
				: null
		});
	}

	async function searchTimelineUnits(query: string) {
		return searchTimelineUnitOptions(hospitalId, query);
	}

	async function labelForBillUnit(value: string): Promise<string> {
		return labelForTimelineUnitId({
			hospitalId,
			value,
			cached: billUnitLabelCache
				? { id: leastBillDurationUnitId, label: billUnitLabelCache }
				: null
		});
	}

	async function savePolicy() {
		if (!apiBase || saveLock.pending) return;
		if (trimmed(leastBillDurationUnitId) === '') {
			toastService.error(
				paraglideMsg(
					'ip_billing_setup_accommodation_least_unit_required',
					'Select a unit for least duration to bill.'
				)
			);
			return;
		}
		await saveLock.run(async () => {
			const res = await fetch(apiBase, {
				method: 'PUT',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					careSetting,
					leastBillDuration: leastQtyFromPolicy(leastBillDuration),
					accommodationBillUnitId: Number(leastBillDurationUnitId),
					accommodationServiceItemId:
						trimmed(accommodationServiceItemId) === ''
							? null
							: Number(accommodationServiceItemId)
				})
			});
			if (!res.ok) {
				const text = await res.text();
				toastService.error(
					sanitizeUserFacingErrorText(text, { status: res.status }) ||
						paraglideMsg(
							'ip_billing_setup_accommodation_save_failed',
							'Save failed.'
						)
				);
				return;
			}
			toastSuccess(
				toastService,
				paraglideMsg(
					'ip_billing_setup_accommodation_saved',
					'Accommodation billing settings saved.'
				)
			);
		});
	}

	$effect(() => {
		void hospitalId;
		void careSetting;
		void loadPolicy();
	});
</script>

<WashCard className="mt-6">
	<WashCardBody>
		<WashCardBodyTitle
			>{isEd
				? paraglideMsg(
						'ed_billing_setup_accommodation_title',
						'ED bed / accommodation charges'
					)
				: paraglideMsg(
						'ip_billing_setup_accommodation_title',
						'IP bed / accommodation charges'
					)}</WashCardBodyTitle
		>
		<p class="mb-4 text-sm text-base-content/70">
			{isEd
				? paraglideMsg(
						'ed_billing_setup_accommodation_blurb',
						'Rates come from Bed Master. Minimum bill block is qty × unit (same unit on the bill line). Pick the ED bed charge service item.'
					)
				: paraglideMsg(
						'ip_billing_setup_accommodation_blurb',
						'Rates come from Bed Master. Each assignment snapshots minimum bill qty, unit, and tariffs. Stay length rounds up to qty × unit per segment. That unit is reused on IP bill lines.'
					)}
		</p>

		{#if loading}
			<p class="text-sm text-base-content/60">Loading…</p>
		{:else if loadError}
			<p class="text-sm text-error">{loadError}</p>
		{:else}
			<div class="grid gap-4 md:grid-cols-2">
				<label class="form-control w-full">
					<span class="label-text mb-1 text-sm"
						>{paraglideMsg(
							'ip_billing_setup_accommodation_least_hours',
							'Least duration to bill'
						)}</span
					>
					<input
						class="input-bordered input w-full"
						type="number"
						min="0"
						step="0.25"
						placeholder={DEFAULT_LEAST_BILL_QTY}
						bind:value={leastBillDuration}
					/>
				</label>

				<label class="form-control w-full">
					<span class="label-text mb-1 text-sm"
						>{paraglideMsg(
							'ip_billing_setup_accommodation_bill_unit',
							'Least duration to bill unit'
						)}</span
					>
					<WashSearchSelect
						className="w-full"
						placeholder={paraglideMsg(
							'ip_billing_setup_accommodation_bill_unit_ph',
							'Search timeline unit…'
						)}
						bind:value={leastBillDurationUnitId}
						searchFn={searchTimelineUnits}
						getLabelForValue={labelForBillUnit}
						minSearchLength={0}
					/>
				</label>

				<p class="text-xs text-base-content/60 md:col-span-2">
					{paraglideMsg(
						'ip_billing_setup_accommodation_least_hours_hint',
						'Example: qty 1 + Day → 24h minimum per assignment; qty 8 + Hour (1h) → 8h minimum. Unit label and qty on the bill match this unit.'
					)}
				</p>

				<label class="form-control w-full md:col-span-2">
					<span class="label-text mb-1 text-sm"
						>{paraglideMsg(
							'ip_billing_setup_accommodation_service',
							'Accommodation service item'
						)}</span
					>
					<WashSearchSelect
						className="w-full"
						placeholder={paraglideMsg(
							'ip_billing_setup_accommodation_service_ph',
							'Search service item…'
						)}
						bind:value={accommodationServiceItemId}
						searchFn={searchServiceItems}
						getLabelForValue={labelForServiceItem}
						minSearchLength={0}
					/>
					<span class="mt-1 text-xs text-base-content/60"
						>{paraglideMsg(
							'ip_billing_setup_accommodation_service_hint',
							`Required before accommodation charges can be posted to an ${billLabel} bill.`
						)}</span
					>
				</label>
			</div>

			<div class="mt-4 flex justify-end">
				<WashButton
					className="btn-primary"
					disabled={saveLock.pending}
					onClick={() => void savePolicy()}
				>
					{paraglideMsg('ip_billing_setup_accommodation_save', 'Save accommodation settings')}
				</WashButton>
			</div>
		{/if}
	</WashCardBody>
</WashCard>
