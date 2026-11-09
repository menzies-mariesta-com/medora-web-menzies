<script lang="ts">
	import OpBillingReadinessPanel from '$lib/component/own/local/private/medora/billing/OpBillingReadinessPanel.svelte';
	import BillingBillLineRows from '$lib/component/own/local/private/medora/billing/BillingBillLineRows.svelte';
	import LucideStrikeThrough from '$lib/component/own/library/lucide/LucideStrikeThrough.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import { BillingStatusTaggingEnum, VisitTypeEnum } from '$lib/model/enum/db-link';
	import {
		type OpenBillVisitDetail
	} from '$lib/tool/billing/billing-open-bills-batch.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { formatMoneyAmount } from '$lib/util/number-display.util';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		hospitalId,
		details = [],
		currentVisitId = '',
		embedded = false,
		onSelectVisit,
		onOpenDiscount
	}: {
		hospitalId: string;
		details: OpenBillVisitDetail[];
		currentVisitId?: string;
		embedded?: boolean;
		onSelectVisit: (visitId: string) => void;
		onOpenDiscount: (visitId: string) => void;
	} = $props();

	function lineKey(line: OpenBillVisitDetail['groups'][0]['lines'][0]): string {
		if (line.lineSource === 'billing_setup') {
			return `billing_setup-${line.id}`;
		}
		if (
			line.lineSource === 'medication_order_line' ||
			line.lineSource === 'service_order_detail' ||
			line.lineSource === 'department_consumption_line'
		) {
			return `${line.lineSource}-${line.id}`;
		}
		return `row-${line.id}`;
	}

	function discountLabel(): string {
		try {
			return msg.op_billing_discount_open?.() ?? 'Discount';
		} catch {
			return 'Discount';
		}
	}

	function totalBillLabel(): string {
		try {
			return msg.op_billing_total_bill?.() ?? 'Total bill';
		} catch {
			return 'Total bill';
		}
	}

	function billingMsg(
		visitTypeId: number | null | undefined,
		key: string,
		fallback: string
	): string {
		const prefix =
			visitTypeId === VisitTypeEnum.IPD ? 'ip_billing_' : 'op_billing_';
		try {
			const fn = msg[`${prefix}${key}`];
			return typeof fn === 'function' ? fn() : fallback;
		} catch {
			return fallback;
		}
	}
</script>

<div class={embedded ? 'space-y-6' : 'border-t border-base-300 bg-base-100 px-3 py-4'}>
	{#if !embedded}
		<p class="mb-4 text-sm font-semibold">
			{msg.billing_scope_view_all?.() ?? 'All open visits'}
		</p>
	{/if}
	<div class="space-y-6">
		{#each details as detail (detail.row.visitId)}
			{@const isClosed =
				detail.data.billing?.statusTaggingId ===
				BillingStatusTaggingEnum.CLOSED}
			<section
				class="rounded-box border border-base-300 bg-base-100/80 p-4"
				class:ring-2={detail.row.visitId === currentVisitId}
				class:ring-primary={detail.row.visitId === currentVisitId}
			>
				<div
					class="mb-3 flex flex-wrap items-center justify-between gap-2"
				>
					<div>
						<h3 class="text-sm font-semibold">
							{detail.row.visitNo ??
								detail.data.visit?.visitNo ??
								detail.row.visitId.slice(0, 8)}
						</h3>
						<p class="text-xs text-base-content/60">
							{detail.row.billKind.toUpperCase()}
							{detail.row.billNo ? ` · ${detail.row.billNo}` : ''}
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						{#if detail.row.visitId !== currentVisitId}
							<WashButton
								className="btn-ghost btn-xs"
								onClick={() => onSelectVisit(detail.row.visitId)}
							>
								{msg.billing_scope_open_bill?.() ??
									'Bill this visit'}
							</WashButton>
						{:else}
							<span class="text-xs text-base-content/60"
								>Current</span
							>
						{/if}
					</div>
				</div>

				<OpBillingReadinessPanel
					readiness={detail.data.readiness}
					{hospitalId}
					visitId={detail.row.visitId}
					draftSubtotal={detail.grandTotal}
					isClosed={isClosed}
				/>

				{#if detail.groups.length === 0}
					<p class="mt-3 text-sm text-base-content/60">
						{msg.op_billing_no_services_found?.() ??
							'No billable services found for this visit.'}
					</p>
				{:else}
					<div
						class="mt-3 flex items-center justify-between gap-3 text-sm font-semibold"
					>
						<span>{totalBillLabel()}</span>
						<div class="flex items-center gap-2">
							<div class="text-right">
								{#if detail.hasDiscount}
									<div
										class="text-xs font-medium text-base-content/60 line-through"
									>
										{formatMoneyAmount(detail.grandTotal)}
									</div>
									<div
										class="font-mono text-base-content tabular-nums"
									>
										{formatMoneyAmount(detail.netTotal)}
									</div>
								{:else}
									<div class="font-mono tabular-nums">
										{formatMoneyAmount(detail.grandTotal)}
									</div>
								{/if}
							</div>
							<WashTooltip tooltipText={discountLabel()} className="">
								<WashButton
									className="btn-primary btn-sm btn-circle"
									disabled={!detail.data.billing || isClosed}
									onClick={() =>
										onOpenDiscount(detail.row.visitId)}
								>
									<LucideStrikeThrough className="size-4" />
								</WashButton>
							</WashTooltip>
						</div>
					</div>

					{#if detail.row.visitTypeId === VisitTypeEnum.IPD && detail.advanceTotal > 0}
						<div
							class="mt-2 flex items-center justify-between gap-3 text-sm"
						>
							<span class="text-base-content/70"
								>Advance deposit (collected)</span
							>
							<span class="font-mono tabular-nums"
								>{formatMoneyAmount(detail.advanceTotal)}</span
							>
						</div>
						<div
							class="mt-1 flex items-center justify-between gap-3 text-sm"
						>
							<span class="text-base-content/70"
								>Applied to bill</span
							>
							<span class="font-mono tabular-nums"
								>− {formatMoneyAmount(detail.advanceCredit)}</span
							>
						</div>
						{#if detail.advanceRefundDue > 0}
							<div
								class="mt-1 flex items-center justify-between gap-3 text-sm font-semibold text-success"
							>
								<span>Refund due</span>
								<span class="font-mono tabular-nums"
									>{formatMoneyAmount(
										detail.advanceRefundDue
									)}</span
								>
							</div>
						{/if}
						<div
							class="mt-1 flex items-center justify-between gap-3 text-sm font-semibold"
						>
							<span>Balance due</span>
							<span class="font-mono tabular-nums"
								>{formatMoneyAmount(detail.payableAmount)}</span
							>
						</div>
					{/if}

					<div
						class="mt-3 rounded-box divide-y divide-base-300 border border-base-300"
					>
						{#each detail.groups as group (group.subCategoryId ?? group.subCategoryName)}
							<div class="collapse-arrow collapse bg-base-100">
								<input type="checkbox" checked />
								<div
									class="collapse-title flex items-center justify-between gap-4 text-sm font-medium"
								>
									<span class="truncate">{group.groupHeading}</span
									>
									<span
										class="font-mono text-base-content/80 tabular-nums"
									>
										{formatMoneyAmount(group.subtotal)}
									</span>
								</div>
								<div class="collapse-content">
									<BillingBillLineRows
										lines={group.lines}
										{lineKey}
										serviceFallback={billingMsg(
											detail.row.visitTypeId,
											'service_fallback',
											'Service'
										)}
										orderPrefix={billingMsg(
											detail.row.visitTypeId,
											'order_prefix',
											'Order'
										)}
										colService={billingMsg(
											detail.row.visitTypeId,
											'print_service',
											'Service'
										)}
										colQty={billingMsg(
											detail.row.visitTypeId,
											'col_qty',
											'Qty'
										)}
										colUnit={billingMsg(
											detail.row.visitTypeId,
											'col_unit',
											'Unit'
										)}
										colUnitPrice={billingMsg(
											detail.row.visitTypeId,
											'col_unit_price',
											'Unit price'
										)}
										colAmount={billingMsg(
											detail.row.visitTypeId,
											'print_amount',
											'Amount'
										)}
									/>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	</div>
</div>
