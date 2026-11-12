<script lang="ts">
	import type { OpBillingLine } from '$lib/model/type/medora/op-billing.type';
	import {
		billingLineQty,
		billingLineTotal,
		billingLineUnitPrice
	} from '$lib/tool/billing/billing-visit-totals.util';
	import { BILLING_LINE_COLUMN_WIDTH } from '$lib/util/op-billing-print-table.util';
	import { formatMoneyAmount } from '$lib/util/number-display.util';

	type Props = {
		lines: OpBillingLine[];
		lineKey: (line: OpBillingLine) => string;
		serviceFallback?: string;
		orderPrefix?: string;
		colService?: string;
		colQty?: string;
		colUnit?: string;
		colUnitPrice?: string;
		colAmount?: string;
	};

	let {
		lines,
		lineKey,
		serviceFallback = 'Service',
		orderPrefix = 'Order',
		colService = 'Service',
		colQty = 'Qty',
		colUnit = 'Unit',
		colUnitPrice = 'Unit price',
		colAmount = 'Amount'
	}: Props = $props();

	const col = BILLING_LINE_COLUMN_WIDTH;

	function formatQty(line: OpBillingLine): string {
		const q = billingLineQty(line);
		return Number.isInteger(q) ? String(q) : String(q);
	}
</script>

<div class="overflow-x-auto">
	<table class="w-full table-fixed border-separate border-spacing-y-1 text-sm">
		<colgroup>
			<col style="width: {col.service}" />
			<col style="width: {col.qty}" />
			<col style="width: {col.unit}" />
			<col style="width: {col.unitPrice}" />
			<col style="width: {col.amount}" />
		</colgroup>
		<thead>
			<tr class="text-xs font-medium text-base-content/60">
				<th class="px-3 text-left font-medium">{colService}</th>
				<th class="px-3 text-right font-medium">{colQty}</th>
				<th class="px-3 text-left font-medium">{colUnit}</th>
				<th class="px-3 text-right font-medium">{colUnitPrice}</th>
				<th class="px-3 text-right font-medium">{colAmount}</th>
			</tr>
		</thead>
		<tbody>
			{#each lines as line (lineKey(line))}
				<tr class="bg-base-200/40">
					<td class="overflow-hidden rounded-l-lg px-3 py-1.5 align-top">
						<p class="truncate font-medium">
							{line.serviceName ?? serviceFallback}
						</p>
						<p class="min-h-[1.25rem] truncate text-xs text-base-content/60">
							{#if line.orderNo}
								{orderPrefix}: {line.orderNo}
							{/if}
						</p>
					</td>
					<td
						class="overflow-hidden px-3 py-1.5 text-right align-top font-mono tabular-nums whitespace-nowrap"
					>
						{formatQty(line)}
					</td>
					<td class="truncate overflow-hidden px-3 py-1.5 align-top text-base-content/80">
						{line.serviceUnitLabel?.trim() || '—'}
					</td>
					<td
						class="overflow-hidden px-3 py-1.5 text-right align-top font-mono tabular-nums whitespace-nowrap"
					>
						{formatMoneyAmount(billingLineUnitPrice(line))}
					</td>
					<td
						class="overflow-hidden rounded-r-lg px-3 py-1.5 text-right align-top font-mono tabular-nums whitespace-nowrap"
					>
						{formatMoneyAmount(billingLineTotal(line))}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
