<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { IpdAccommodationBillingMethodEnum } from '$lib/model/enum/db-link';
	import type {
		AccommodationBillingCareSetting,
		IpdAccommodationBillingPolicyRow
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

	let {
		careSetting = 'IP' as AccommodationBillingCareSetting
	}: {
		careSetting?: AccommodationBillingCareSetting;
	} = $props();

	const toastService = new ToastService();
	const saveLock = createActionLock();
	const isEd = $derived(careSetting === 'ED');
	const billLabel = $derived(isEd ? 'ED' : 'IP');

	/** Number inputs bind a number; empty stays ''. */
	function trimmed(value: unknown): string {
		return value == null ? '' : String(value).trim();
	}

	function decimalInput(value: unknown): string {
		return decimalInputStringFromScale(
			value as string | number | null | undefined,
			4
		);
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
	let billingMethod = $state(String(IpdAccommodationBillingMethodEnum.BLOCK_24H));
	let graceMinutes = $state('0');
	let minimumDays = $state('');
	let leastBillDurationHours = $state('');
	let cutoffTime = $state('12:00');
	let accommodationServiceItemId = $state('');
	let accommodationBillUnitId = $state('');
	let billUnitLabelCache = $state('');

	const methodOptions = [
		{
			value: String(IpdAccommodationBillingMethodEnum.BLOCK_24H),
			label: paraglideMsg(
				'ip_billing_setup_accommodation_method_block',
				'24-hour blocks'
			)
		},
		{
			value: String(IpdAccommodationBillingMethodEnum.CALENDAR_DAY),
			label: paraglideMsg(
				'ip_billing_setup_accommodation_method_calendar',
				'Calendar day (cut-off time)'
			)
		},
		{
			value: String(IpdAccommodationBillingMethodEnum.PRO_RATA),
			label: paraglideMsg(
				'ip_billing_setup_accommodation_method_prorata',
				'Pro-rata (hours ÷ 24)'
			)
		}
	];

	const showCutoff = $derived(
		Number(billingMethod) === IpdAccommodationBillingMethodEnum.CALENDAR_DAY
	);

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
				policy: IpdAccommodationBillingPolicyRow;
				accommodationServiceName?: string | null;
				accommodationBillUnitName?: string | null;
			};
			const p = data.policy;
			billingMethod = String(p.billingMethod);
			graceMinutes = String(p.graceMinutes ?? 0);
			minimumDays = decimalInput(p.minimumDays);
			leastBillDurationHours = decimalInput(p.leastBillDurationHours);
			cutoffTime = trimmed(p.cutoffTime) || '12:00';
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
			accommodationBillUnitId =
				p.accommodationBillUnitId != null
					? String(p.accommodationBillUnitId)
					: '';
			billUnitLabelCache = data.accommodationBillUnitName?.trim() ?? '';
		} catch {
			loadError = paraglideMsg(
				'ip_billing_setup_accommodation_load_failed',
				'Failed to load accommodation policy.'
			);
		} finally {
			loading = false;
		}
	}

	let serviceItemLabelCache = $state('');

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
				? { id: accommodationBillUnitId, label: billUnitLabelCache }
				: null
		});
	}

	async function savePolicy() {
		if (!apiBase || saveLock.pending) return;
		await saveLock.run(async () => {
			const res = await fetch(apiBase, {
				method: 'PUT',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					careSetting,
					billingMethod: Number(billingMethod),
					graceMinutes: Number(graceMinutes) || 0,
					minimumDays:
						decimalInput(minimumDays) === ''
							? null
							: decimalInput(minimumDays),
					leastBillDurationHours:
						decimalInput(leastBillDurationHours) === ''
							? null
							: decimalInput(leastBillDurationHours),
					cutoffTime: trimmed(cutoffTime) || '12:00',
					accommodationServiceItemId:
						trimmed(accommodationServiceItemId) === ''
							? null
							: Number(accommodationServiceItemId),
					accommodationBillUnitId:
						trimmed(accommodationBillUnitId) === ''
							? null
							: Number(accommodationBillUnitId)
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
						'Rates come from Bed Master (base price and room/ward markups). Choose how ED bed stay length converts to billable time and which service item is used for the ED bed charge.'
					)
				: paraglideMsg(
						'ip_billing_setup_accommodation_blurb',
						'Rates come from Bed Master (base price and room/ward markups). Map a Timeline unit per bed for bill qty and unit label. Choose how stay length converts to billable days and which service item is used when accommodation lines are posted to the IP bill.'
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
							'ip_billing_setup_accommodation_method',
							'Billing method'
						)}</span
					>
					<WashSelect
						className="select-bordered select w-full"
						bind:value={billingMethod}
						options={methodOptions}
					/>
				</label>

				<label class="form-control w-full">
					<span class="label-text mb-1 text-sm"
						>{paraglideMsg(
							'ip_billing_setup_accommodation_grace',
							'Grace period (minutes)'
						)}</span
					>
					<input
						class="input-bordered input w-full"
						type="number"
						min="0"
						step="1"
						bind:value={graceMinutes}
					/>
				</label>

				{#if showCutoff}
					<label class="form-control w-full">
						<span class="label-text mb-1 text-sm"
							>{paraglideMsg(
								'ip_billing_setup_accommodation_cutoff',
								'Cut-off time (HH:mm)'
							)}</span
						>
						<input
							class="input-bordered input w-full"
							type="time"
							bind:value={cutoffTime}
						/>
					</label>
				{/if}

				<label class="form-control w-full">
					<span class="label-text mb-1 text-sm"
						>{paraglideMsg(
							'ip_billing_setup_accommodation_minimum',
							'Minimum billable days (optional)'
						)}</span
					>
					<input
						class="input-bordered input w-full"
						type="number"
						min="0"
						step="0.01"
						placeholder="—"
						bind:value={minimumDays}
					/>
				</label>

				<label class="form-control w-full">
					<span class="label-text mb-1 text-sm"
						>{paraglideMsg(
							'ip_billing_setup_accommodation_least_hours',
							'Least duration to bill (hours)'
						)}</span
					>
					<input
						class="input-bordered input w-full"
						type="number"
						min="0"
						step="0.25"
						placeholder="—"
						bind:value={leastBillDurationHours}
					/>
					<span class="mt-1 text-xs text-base-content/60"
						>{paraglideMsg(
							'ip_billing_setup_accommodation_least_hours_hint',
							'When set, stay length rounds up to this block (e.g. 8 → 4h stay bills 8h; 12h stay bills 16h). Overrides billing method.'
						)}</span
					>
				</label>

				<label class="form-control w-full md:col-span-2">
					<span class="label-text mb-1 text-sm"
						>{paraglideMsg(
							'ip_billing_setup_accommodation_bill_unit',
							'Bill unit'
						)}</span
					>
					<WashSearchSelect
						className="w-full"
						placeholder={paraglideMsg(
							'ip_billing_setup_accommodation_bill_unit_ph',
							'Search timeline unit…'
						)}
						bind:value={accommodationBillUnitId}
						searchFn={searchTimelineUnits}
						getLabelForValue={labelForBillUnit}
						minSearchLength={0}
					/>
					<span class="mt-1 text-xs text-base-content/60"
						>{paraglideMsg(
							'ip_billing_setup_accommodation_bill_unit_hint',
							'Unit shown on the bed line. Qty and unit price convert into this unit. Empty uses each bed’s base price unit.'
						)}</span
					>
				</label>

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
