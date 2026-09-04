import type { ItemNamePriceRow } from '$lib/model/type/heka/medication-order.type';

function formatStockQtyDisplay(qtyStr: string | null | undefined): string | null {
	if (qtyStr == null || qtyStr.trim() === '') return null;
	const n = Number(qtyStr);
	if (!Number.isFinite(n) || n <= 0) return null;
	if (Number.isInteger(n)) return String(n);
	const rounded = Math.round(n * 1e4) / 1e4;
	return String(rounded);
}

/** Item search option: name with store on-hand (issue unit) beside it. */
export function formatMedOrderItemSearchLabel(
	row: Pick<
		ItemNamePriceRow,
		'itemName' | 'stockIssueQty' | 'issueUnitName'
	>
): string {
	const name = row.itemName?.trim() || '—';
	const qty = formatStockQtyDisplay(row.stockIssueQty);
	if (qty == null) return name;
	const unit = row.issueUnitName?.trim();
	const stock = unit ? `${qty} ${unit}` : qty;
	return `${name} · ${stock}`;
}
