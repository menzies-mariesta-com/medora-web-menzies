<script lang="ts">
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { BillingVisitOpenModeEnum } from '$lib/model/enum/billing-visit-open-mode.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { BillingBillContextResponse } from '$lib/model/type/medora/billing-context.type';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import {
		fetchAllOpenBillVisitDetails,
		type OpenBillVisitDetail
	} from '$lib/tool/billing/billing-open-bills-batch.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { parseUuid } from '$lib/util/id.util';
	import { formatMoneyAmount } from '$lib/util/number-display.util';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		hospitalId,
		visitId = '',
		billingViewAll = $bindable(false),
		openBillDetails = $bindable([] as OpenBillVisitDetail[]),
		openBillDetailsLoading = $bindable(false),
		openBillsGrandTotal = $bindable('0')
	}: {
		hospitalId: string;
		visitId?: string;
		billingViewAll?: boolean;
		openBillDetails?: OpenBillVisitDetail[];
		openBillDetailsLoading?: boolean;
		openBillsGrandTotal?: string;
	} = $props();

	let context = $state<BillingBillContextResponse | null>(null);
	let loadError = $state<string | null>(null);
	let isLoading = $state(false);
	let contextReloadSeq = $state(0);
	let batchError = $state<string | null>(null);

	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/billing/bill/context`
			: ''
	);

	function opMsg(key: string, fallback: string): string {
		try {
			const fn = msg[`op_billing_${key}`];
			return typeof fn === 'function' ? fn() : fallback;
		} catch {
			return fallback;
		}
	}

	const otherGroupLabel = $derived(opMsg('group_other', 'Other'));

	function reloadContext() {
		contextReloadSeq += 1;
	}

	async function loadContext(base: string, vid: string): Promise<void> {
		const qs = new URLSearchParams({ visitId: vid });
		const res = await fetch(`${base}?${qs}`, { credentials: 'include' });
		if (!res.ok) {
			const t = await res.text();
			throw new Error(t || `HTTP ${res.status}`);
		}
		const data = (await res.json()) as BillingBillContextResponse;
		context = data;
		openBillsGrandTotal = data.openBillsGrandTotal;
		if (
			data.visitOpenMode === BillingVisitOpenModeEnum.ONE_VISIT_ONE_BILL &&
			data.suggestedVisitId &&
			!VisitState.visitId
		) {
			VisitState.visitId = data.suggestedVisitId;
		}
		if (data.patientId) {
			VisitState.patientId = data.patientId;
		}
	}

	async function loadOpenBillDetails(
		rows: BillingBillContextResponse['openBills']
	): Promise<void> {
		if (!hospitalId || rows.length < 2) {
			openBillDetails = [];
			return;
		}
		openBillDetailsLoading = true;
		try {
			openBillDetails = await fetchAllOpenBillVisitDetails({
				hospitalId,
				rows,
				otherGroupLabel: otherGroupLabel
			});
		} catch (e) {
			openBillDetails = [];
			batchError =
				e instanceof Error ? e.message : 'Failed to load visit bills.';
		} finally {
			openBillDetailsLoading = false;
		}
	}

	$effect(() => {
		const base = apiBase;
		const vid = parseUuid(visitId) ?? '';
		void contextReloadSeq;
		void VisitState.billingRefreshRevision;
		if (!base || !vid) {
			context = null;
			loadError = null;
			openBillDetails = [];
			return;
		}
		let cancelled = false;
		isLoading = true;
		loadError = null;
		void loadContext(base, vid)
			.then(() => {
				if (cancelled || !context) return;
				if (context.openBills.length > 1) {
					return loadOpenBillDetails(context.openBills);
				}
				openBillDetails = [];
			})
			.catch((e) => {
				if (!cancelled) {
					context = null;
					openBillDetails = [];
					loadError =
						e instanceof Error ? e.message : 'Failed to load';
				}
			})
			.finally(() => {
				if (!cancelled) isLoading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	function selectVisit(rowVisitId: string, patientName?: string) {
		billingViewAll = false;
		VisitState.visitId = rowVisitId;
		if (patientName) VisitState.patientName = patientName;
	}

	function chooseViewAll() {
		billingViewAll = true;
		if (
			context &&
			context.openBills.length > 1 &&
			openBillDetails.length !== context.openBills.length &&
			!openBillDetailsLoading
		) {
			void loadOpenBillDetails(context.openBills);
		}
	}

	const showOpenBillsTable = $derived((context?.openBills.length ?? 0) > 0);
	const showMultiVisitFooter = $derived((context?.openBills.length ?? 0) > 1);
</script>

{#if !visitId}
	<p class="mb-3 text-sm text-base-content/70">
		{msg.billing_scope_select_visit?.() ??
			'Select a visit to see open bills for that patient.'}
	</p>
{:else if isLoading}
	<p class="mb-3 text-sm text-base-content/60">Loading billing context…</p>
{:else if loadError}
	<p class="mb-3 text-sm text-error">{loadError}</p>
{:else if context}
	{#if context.visitOpenMode === BillingVisitOpenModeEnum.ONE_VISIT_ONE_BILL && context.openBills.length > 0}
		<WashAlert
			className="mb-3"
			type={StatusColorEnum.INFO}
			message={msg.billing_scope_one_bill_banner?.() ??
				'Close all open bills before opening another visit for this patient.'}
		/>
	{/if}

	{#if batchError}
		<WashAlert
			className="mb-3"
			type={StatusColorEnum.ERROR}
			message={batchError}
		/>
	{/if}

	{#if showOpenBillsTable}
		<div class="mb-4 overflow-x-auto rounded-box border border-base-300">
			<p
				class="border-b border-base-300 bg-base-200 px-3 py-2 text-sm font-semibold"
			>
				{msg.billing_scope_open_bills_title?.() ??
					'Open bills for this patient'}
			</p>
			<table class="table table-sm">
				<thead>
					<tr>
						<th>Visit</th>
						<th>Bill</th>
						<th class="text-right">
							{msg.billing_scope_bill_total?.() ?? 'Bill total'}
						</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each context.openBills as row (row.visitId)}
						<tr
							class:bg-base-200={!billingViewAll &&
								row.visitId === visitId}
						>
							<td>{row.visitNo ?? row.visitId.slice(0, 8)}</td>
							<td>
								{row.billKind.toUpperCase()}
								{row.billNo ? ` · ${row.billNo}` : ''}
							</td>
							<td class="text-right font-mono tabular-nums">
								{formatMoneyAmount(row.draftTotal)}
							</td>
							<td class="text-right">
								{#if !billingViewAll && row.visitId === visitId}
									<span class="text-xs text-base-content/60"
										>Current</span
									>
								{:else}
									<WashButton
										className="btn-ghost btn-xs"
										onClick={() => selectVisit(row.visitId)}
									>
										{msg.billing_scope_open_bill?.() ??
											'Bill this visit'}
									</WashButton>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
				{#if showMultiVisitFooter}
					<tfoot>
						<tr class="font-semibold">
							<td colspan="2">
								{msg.billing_scope_grand_total?.() ??
									'Total (all visits)'}
							</td>
							<td class="text-right font-mono tabular-nums">
								{formatMoneyAmount(context.openBillsGrandTotal)}
							</td>
							<td class="text-right">
								<WashButton
									className={billingViewAll
										? 'btn-primary btn-xs'
										: 'btn-ghost btn-xs'}
									disabled={openBillDetailsLoading}
									onClick={chooseViewAll}
								>
									{msg.billing_scope_view_all?.() ??
										'View all visits'}
								</WashButton>
							</td>
						</tr>
					</tfoot>
				{/if}
			</table>
		</div>
	{:else if context.openBills.length === 0}
		<p class="mb-3 text-sm text-base-content/60">
			{msg.billing_scope_no_open_bills?.() ??
				'No open bills for this patient.'}
		</p>
	{/if}
{/if}
