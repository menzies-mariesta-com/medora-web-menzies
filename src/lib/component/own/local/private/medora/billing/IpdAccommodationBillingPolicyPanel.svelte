<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { IpdAccommodationBillingMethodEnum } from '$lib/model/enum/db-link';
	import type { IpdAccommodationBillingPolicyRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { sanitizeUserFacingErrorText } from '$lib/util/user-facing-error.util';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const toastService = new ToastService();
	const saveLock = createActionLock();
	const msg = m as Record<string, (inputs?: object) => string>;

	function tr(key: string, fallback: string): string {
		try {
			const fn = msg[key];
			return typeof fn === 'function' ? fn() : fallback;
		} catch {
			return fallback;
		}
	}

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/administration/billing-setup/ip-billing/accommodation-policy`
			: ''
	);

	let loading = $state(true);
	let loadError = $state('');
	let billingMethod = $state(String(IpdAccommodationBillingMethodEnum.BLOCK_24H));
	let graceMinutes = $state('0');
	let minimumDays = $state('');
	let cutoffTime = $state('12:00');
	let accommodationServiceItemId = $state('');

	const methodOptions = [
		{
			value: String(IpdAccommodationBillingMethodEnum.BLOCK_24H),
			label: tr(
				'ip_billing_setup_accommodation_method_block',
				'24-hour blocks'
			)
		},
		{
			value: String(IpdAccommodationBillingMethodEnum.CALENDAR_DAY),
			label: tr(
				'ip_billing_setup_accommodation_method_calendar',
				'Calendar day (cut-off time)'
			)
		},
		{
			value: String(IpdAccommodationBillingMethodEnum.PRO_RATA),
			label: tr(
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
					}) || tr('ip_billing_setup_accommodation_load_failed', 'Failed to load.');
				return;
			}
			const data = (await res.json()) as {
				policy: IpdAccommodationBillingPolicyRow;
				accommodationServiceName?: string | null;
			};
			const p = data.policy;
			billingMethod = String(p.billingMethod);
			graceMinutes = String(p.graceMinutes ?? 0);
			minimumDays = p.minimumDays?.trim() ?? '';
			cutoffTime = p.cutoffTime?.trim() || '12:00';
			accommodationServiceItemId =
				p.accommodationServiceItemId != null
					? String(p.accommodationServiceItemId)
					: '';
			if (
				p.accommodationServiceItemId != null &&
				data.accommodationServiceName
			) {
				serviceItemLabelCache = `${data.accommodationServiceName} (#${p.accommodationServiceItemId})`;
			}
		} catch {
			loadError = tr(
				'ip_billing_setup_accommodation_load_failed',
				'Failed to load accommodation policy.'
			);
		} finally {
			loading = false;
		}
	}

	let serviceItemLabelCache = $state('');

	async function searchServiceItems(query: string) {
		if (!hospitalId) return [];
		const qs = new URLSearchParams({
			mode: 'paginated',
			page: '1',
			pageSize: '20',
			serviceName: query.trim()
		});
		const res = await fetch(
			`/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/administration/service-order/service-item-master?${qs}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return [];
		const pack = (await res.json()) as {
			data?: Array<{
				id: number;
				serviceName: string | null;
				serviceCode: string | null;
			}>;
		};
		return (pack.data ?? []).map((row) => ({
			value: String(row.id),
			label: [row.serviceName, row.serviceCode ? `(${row.serviceCode})` : '']
				.filter(Boolean)
				.join(' ')
		}));
	}

	async function labelForServiceItem(value: string): Promise<string> {
		if (!value || !hospitalId) return '';
		if (
			serviceItemLabelCache &&
			value === accommodationServiceItemId
		) {
			return serviceItemLabelCache;
		}
		const qs = new URLSearchParams({
			mode: 'all',
			id: value
		});
		const res = await fetch(
			`/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/administration/service-order/service-item-master?${qs}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return `#${value}`;
		const rows = (await res.json()) as Array<{
			serviceName: string | null;
		}>;
		const name = rows[0]?.serviceName?.trim();
		return name ? `${name} (#${value})` : `#${value}`;
	}

	async function savePolicy() {
		if (!apiBase || saveLock.pending) return;
		await saveLock.run(async () => {
			const res = await fetch(apiBase, {
				method: 'PUT',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					billingMethod: Number(billingMethod),
					graceMinutes: Number(graceMinutes) || 0,
					minimumDays: minimumDays.trim() === '' ? null : minimumDays.trim(),
					cutoffTime: cutoffTime.trim() || '12:00',
					accommodationServiceItemId:
						accommodationServiceItemId.trim() === ''
							? null
							: Number(accommodationServiceItemId)
				})
			});
			if (!res.ok) {
				const text = await res.text();
				toastService.error(
					sanitizeUserFacingErrorText(text, { status: res.status }) ||
						tr(
							'ip_billing_setup_accommodation_save_failed',
							'Save failed.'
						)
				);
				return;
			}
			toastSuccess(
				toastService,
				tr(
					'ip_billing_setup_accommodation_saved',
					'Accommodation billing settings saved.'
				)
			);
		});
	}

	$effect(() => {
		void hospitalId;
		void loadPolicy();
	});
</script>

<WashCard className="mb-6">
	<WashCardBody>
		<WashCardBodyTitle
			>{tr(
				'ip_billing_setup_accommodation_title',
				'Bed / accommodation charges'
			)}</WashCardBodyTitle
		>
		<p class="mb-4 text-sm text-base-content/70">
			{tr(
				'ip_billing_setup_accommodation_blurb',
				'Daily rates come from Ward Master (bed base price and room/ward markups). Stay segments are recorded on admit, transfer, and discharge. Choose how stay length converts to billable days and which service item is used when accommodation lines are posted to the IP bill.'
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
						>{tr(
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
						>{tr(
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
							>{tr(
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
						>{tr(
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

				<label class="form-control w-full md:col-span-2">
					<span class="label-text mb-1 text-sm"
						>{tr(
							'ip_billing_setup_accommodation_service',
							'Accommodation service item'
						)}</span
					>
					<WashSearchSelect
						className="w-full"
						placeholder={tr(
							'ip_billing_setup_accommodation_service_ph',
							'Search service item…'
						)}
						bind:value={accommodationServiceItemId}
						searchFn={searchServiceItems}
						getLabelForValue={labelForServiceItem}
						minSearchLength={0}
					/>
					<span class="mt-1 text-xs text-base-content/60"
						>{tr(
							'ip_billing_setup_accommodation_service_hint',
							'Required before accommodation charges can be posted to an IP bill.'
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
					{tr('ip_billing_setup_accommodation_save', 'Save accommodation settings')}
				</WashButton>
			</div>
		{/if}
	</WashCardBody>
</WashCard>
