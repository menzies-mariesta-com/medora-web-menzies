<script lang="ts">
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import InventoryBatchQtyPickQtyCell from '$lib/component/own/local/private/medora/inventory/InventoryBatchQtyPickQtyCell.svelte';
	import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/medora/department-consumption-detail.type';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { m } from '$lib/paraglide/messages';
	import {
		trimInventoryNumericDisplay,
		trimMetricQtyDisplay
	} from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import { purchaseQtyToIssueQtyNumber } from '$lib/tool/inventory/purchase-issue-qty-convert.util';

	type IumFactors = {
		purchaseConversionFactor: string;
		issueConversionFactor: string;
	};

	let {
		allocations = $bindable([]),
		factors,
		purchaseUnitLabel,
		issueUnitLabel,
		disabled = false,
		showSalePrice = true,
		priceColumn = 'sale'
	}: {
		allocations: ConsumptionBatchAllocationDraft[];
		factors: IumFactors | null;
		purchaseUnitLabel: string;
		issueUnitLabel: string;
		disabled?: boolean;
		showSalePrice?: boolean;
		priceColumn?: 'sale' | 'emp';
	} = $props();

	function stockDisplay(
		row: ConsumptionBatchAllocationDraft
	): string {
		const q =
			row.stockIssueQty != null
				? String(row.stockIssueQty).trim()
				: '';
		const qtyDisp = q ? trimMetricQtyDisplay(q) : '';
		const iu = (issueUnitLabel ?? '').trim();
		if (!qtyDisp) return '—';
		return iu ? `${qtyDisp} ${iu}` : qtyDisp;
	}

	function priceDisp(row: ConsumptionBatchAllocationDraft): string {
		const raw =
			priceColumn === 'emp'
				? row.empSalePrice
				: row.salePrice;
		const t = raw != null ? String(raw).trim() : '';
		return t ? trimInventoryNumericDisplay(t, 4) : '—';
	}

	function exceedsStock(
		row: ConsumptionBatchAllocationDraft
	): boolean {
		if (!factors) return false;
		const qp = String(row.qtyPurchase ?? '').trim();
		if (!qp || Number(qp) <= 0) return false;
		const need = purchaseQtyToIssueQtyNumber(
			qp,
			factors.purchaseConversionFactor,
			factors.issueConversionFactor
		);
		if (need == null) return false;
		const avail = Number(row.stockIssueQty);
		return need > avail + 1e-6;
	}

	function setQtyPurchase(rowIndex: number, next: string) {
		// Reassign so derived values update even on deep edits.
		allocations = allocations.map((a, i) =>
			i === rowIndex ? { ...a, qtyPurchase: next } : a
		);
	}

	let columnFilters = $state<Record<string, string>>({});

	const showGrnReceipt = $derived(
		allocations.some(
			(a) =>
				(a.grnReceivedDate?.trim() ?? '') !== '' ||
				(a.grnInvoiceNo?.trim() ?? '') !== ''
		)
	);

	function grnReceiptLabel(row: ConsumptionBatchAllocationDraft): string {
		const date = row.grnReceivedDate?.trim() ?? '';
		const inv = row.grnInvoiceNo?.trim() ?? '';
		if (date && inv) return `${date} · ${inv}`;
		return date || inv || '—';
	}

	const columns = $derived.by(() => {
		const base: MenziesTableColumn<ConsumptionBatchAllocationDraft>[] = [
			{
				id: 'batchNo',
				header: m.inv_stock_col_batch(),
				filterable: true,
				filterType: 'text',
				cellClass: 'align-middle font-medium',
				format: (_value, row) => row.batchNo?.trim() || '—'
			},
			{
				id: 'expiryDate',
				header: m.inv_stock_col_expiry(),
				filterable: false,
				cellClass: 'align-middle whitespace-nowrap',
				format: (_value, row) => row.expiryDate ?? '—'
			}
		];

		if (showGrnReceipt) {
			base.push({
				id: 'grnReceivedDate',
				header: m.inv_stock_col_grn_receipt(),
				filterable: true,
				filterType: 'text',
				cellClass: 'align-middle whitespace-nowrap text-xs',
				format: (_value, row) => grnReceiptLabel(row)
			});
		}

		base.push({
			id: 'stockIssueQty',
			header: m.inv_dc_batch_table_stock(),
			filterable: false,
			cellClass: 'align-middle whitespace-nowrap',
			format: (_value, row) => stockDisplay(row)
		});

		if (showSalePrice) {
			base.push({
				id: priceColumn === 'emp' ? 'empSalePrice' : 'salePrice',
				header:
					priceColumn === 'emp'
						? m.inv_stock_col_emp_sale_price()
						: m.inv_stock_col_sale_price(),
				filterable: false,
				cellClass: 'align-middle whitespace-nowrap',
				format: (_value, row) => priceDisp(row)
			});
		}

		base.push({
			id: 'qtyPurchase',
			header: m.inv_dc_batch_table_qty_purchase(),
			filterable: false,
			widthClass: 'min-w-[8rem]',
			cellClass: 'align-middle',
			cellComponentGetter: (row, rowIndex) => ({
				component: InventoryBatchQtyPickQtyCell,
				props: {
					value: row.qtyPurchase,
					disabled,
					ariaLabel:
						`${m.inv_dc_batch_table_qty_purchase()} ${row.batchNo ?? ''}`.trim(),
					onChange: (v: string) => setQtyPurchase(rowIndex, v)
				}
			})
		});

		return base;
	});

	const totalQtyToUse = $derived.by(() => {
		let sum = 0;
		for (const a of allocations) {
			const n = Number(String(a.qtyPurchase).trim());
			if (Number.isFinite(n) && n > 0) sum += n;
		}
		return sum;
	});
</script>

<div class="overflow-x-auto rounded-lg border border-base-300">
	<MenziesTable
		rows={allocations}
		{columns}
		isLoading={false}
		showRowActions={false}
		actionsVariant="none"
		showRefreshButton={false}
		enableColumnFilters={false}
		bind:columnFilters
		emptyMessage={m.inv_dc_batch_table_empty()}
		pageSizeOptions={[AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE]}
		pageSize={String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)}
		currentPage={1}
		rowClassGetter={(row) => (exceedsStock(row) ? 'bg-error/10' : '')}
	/>
</div>
<label class="mt-2 block text-xs opacity-70">
	{m.inv_dc_batch_table_qty_hint({ unit: purchaseUnitLabel || '—' })}
</label>

<div class="mt-1 text-right text-sm">
	<span class="opacity-70"
		>{m.inv_dc_batch_table_total_to_use()}:</span
	>
	<span class="ml-2 font-semibold">
		{totalQtyToUse > 0 ? String(totalQtyToUse) : '—'}
	</span>
	{#if purchaseUnitLabel?.trim()}
		<span class="ml-1 opacity-70">{purchaseUnitLabel.trim()}</span>
	{/if}
</div>
