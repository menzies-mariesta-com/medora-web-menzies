import type { LineItemMetricTile } from '$lib/tool/inventory/line-item-metric-tiles.util';

type IumLike = {
	id: number;
	purchaseConversionFactor?: string | number | null;
	issueConversionFactor?: string | number | null;
	issueUnitName?: string | null;
};

type DraftLike = {
	itemUnitMasterId?: number | null;
	iumList?: IumLike[];
	quantity?: string | null;
};

function selectedIum(
	draft: DraftLike | null | undefined
): IumLike | null {
	if (
		draft?.itemUnitMasterId == null ||
		!Array.isArray(draft?.iumList)
	)
		return null;
	return (
		draft.iumList.find((u) => u.id === draft.itemUnitMasterId) ?? null
	);
}

function stripTrailingZerosAfterDot(s: string): string {
	if (!s.includes('.')) return s;
	let x = s.replace(/0+$/, '');
	if (x.endsWith('.')) x = x.slice(0, -1);
	return x || '0';
}

/** Strip trailing fractional zeros without losing digits present in the string (e.g. DB `decimal` text). */
function trimTrailingZerosFromPlainDecimalString(
	raw: string
): string {
	const t = raw.trim();
	const neg = t.startsWith('-');
	const u = neg ? t.slice(1) : t;
	const m = /^(\d+)\.(\d+)$/.exec(u);
	if (!m) return raw;
	const frac = m[2].replace(/0+$/, '');
	const core = frac === '' ? m[1] : `${m[1]}.${frac}`;
	return neg ? `-${core}` : core;
}

/**
 * Trims trailing fractional zeros for inventory qty / money inputs and formatted cells
 * (e.g. `10.000000` → `10`, `10.500000` → `10.5`).
 */
export function trimInventoryNumericDisplay(
	value: string | number | null | undefined,
	maxFractionDigits = 14
): string {
	if (value == null) return '';
	const t = String(value).trim();
	if (t === '') return '';
	if (/^-?\d+\.\d+$/.test(t)) {
		return trimTrailingZerosFromPlainDecimalString(t);
	}
	const n = Number(t);
	if (!Number.isFinite(n)) return t;
	let s = n.toFixed(maxFractionDigits);
	s = stripTrailingZerosAfterDot(s);
	if (s === '-0') return '0';
	return s || '0';
}

/** Trims trailing zeros from a decimal string for display (e.g. `10.000000` → `10`). */
export function trimMetricQtyDisplay(qtyStr: string): string {
	return trimInventoryNumericDisplay(qtyStr, 6);
}

/** Mutate draft fields once when opening modals so DB decimals don’t show as `xx.000000…`. */
export function trimInventoryDraftNumericFieldsInPlace(
	draft: Record<string, unknown> | null | undefined,
	keys: readonly string[],
	maxFractionDigits = 14
): void {
	if (!draft) return;
	for (const k of keys) {
		const v = draft[k];
		if (v == null) continue;
		if (typeof v !== 'string' && typeof v !== 'number') continue;
		const trimmed = trimInventoryNumericDisplay(v, maxFractionDigits);
		const cur = String(v).trim();
		if (trimmed !== cur) draft[k] = trimmed;
	}
}

/**
 * Same as server `purchaseQtyToIssueQtyString`: issueQty = purchaseQty × purchaseFactor / issueFactor.
 */
export function purchaseQtyStrToIssueQtyTrimmed(
	purchaseQtyStr: string,
	purchaseFactorStr: string,
	issueFactorStr: string
): string {
	const q = Number(purchaseQtyStr);
	const pf = Number(purchaseFactorStr);
	const itf = Number(issueFactorStr);
	if (
		!Number.isFinite(q) ||
		!Number.isFinite(pf) ||
		!Number.isFinite(itf) ||
		pf <= 0 ||
		itf <= 0
	) {
		return trimMetricQtyDisplay(purchaseQtyStr);
	}
	const issue = (q * pf) / itf;
	if (!Number.isFinite(issue))
		return trimMetricQtyDisplay(purchaseQtyStr);
	return trimInventoryNumericDisplay(issue, 6);
}

/**
 * Renders a metric tile: purchase-denominated values convert to **issue** qty + issue unit;
 * issue-denominated values get the selected conversion’s issue unit label when helpful.
 */
export function formatLineItemMetricTileValue(
	tile: LineItemMetricTile,
	draft: DraftLike | null | undefined
): string {
	if (tile.convertPurchaseQtyToIssueForDisplay) {
		const ium = selectedIum(draft);
		const pf =
			ium?.purchaseConversionFactor != null
				? String(ium.purchaseConversionFactor)
				: '';
		const itf =
			ium?.issueConversionFactor != null
				? String(ium.issueConversionFactor)
				: '';
		if (!ium || !pf || !itf) return trimMetricQtyDisplay(tile.value);
		const issue = purchaseQtyStrToIssueQtyTrimmed(
			tile.value,
			pf,
			itf
		);
		const iu = (ium.issueUnitName ?? '').trim();
		return iu ? `${issue} ${iu}`.trim() : issue;
	}
	if (tile.appendSelectedIssueUnitToValue) {
		const base = trimMetricQtyDisplay(tile.value);
		const ium = selectedIum(draft);
		const iu = (ium?.issueUnitName ?? '').trim();
		return iu ? `${base} ${iu}`.trim() : base;
	}
	return trimMetricQtyDisplay(tile.value);
}

/**
 * One-line hint for the line modal quantity field: purchase qty → issue qty + issue unit.
 * Returns `null` when conversion cannot be shown (no unit, invalid qty, missing factors).
 */
export function formatPurchaseQtyAsIssueEquivalent(
	draft: DraftLike | null | undefined
): string | null {
	const raw = draft?.quantity?.trim();
	if (!raw || !Number.isFinite(Number(raw)) || Number(raw) <= 0)
		return null;
	const ium = selectedIum(draft);
	const pf =
		ium?.purchaseConversionFactor != null
			? String(ium.purchaseConversionFactor)
			: '';
	const itf =
		ium?.issueConversionFactor != null
			? String(ium.issueConversionFactor)
			: '';
	if (!ium || !pf || !itf) return null;
	const issue = purchaseQtyStrToIssueQtyTrimmed(raw, pf, itf);
	const iu = (ium.issueUnitName ?? '').trim();
	if (!iu) return issue;
	return `${issue} ${iu}`.trim();
}

function resolveIumForPurchaseQtyRow(
	row:
		| {
				itemUnitMasterId?: number | null;
				iumList?: IumLike[] | null;
		  }
		| null
		| undefined,
	catalog?: Map<number, IumLike> | null
): IumLike | null {
	const id = row?.itemUnitMasterId;
	if (id != null && catalog?.has(id)) {
		return catalog.get(id) ?? null;
	}
	return selectedIum({
		itemUnitMasterId: row?.itemUnitMasterId,
		iumList: row?.iumList ?? undefined
	});
}

/** Build a lookup from GET `item-master?mode=itemUnitMasters` for approve/detail tables without per-line `iumList`. */
export function itemUnitMastersResponseToCatalog(
	rows: {
		id: number;
		purchaseConversionFactor?: string | number | null;
		issueConversionFactor?: string | number | null;
		issueUnitName?: string | null;
	}[]
): Map<number, IumLike> {
	const m = new Map<number, IumLike>();
	for (const r of rows) {
		m.set(r.id, {
			id: r.id,
			purchaseConversionFactor: r.purchaseConversionFactor,
			issueConversionFactor: r.issueConversionFactor,
			issueUnitName: r.issueUnitName
		});
	}
	return m;
}

/**
 * Table cell: trimmed purchase qty plus issue equivalent when factors exist
 * (from `row.iumList` and/or optional hospital-wide `catalog` keyed by `itemUnitMasterId`).
 */
export function formatPurchaseQtyCellWithIssueEquivalent(
	row: {
		quantity?: string | null;
		itemUnitMasterId?: number | null;
		iumList?: IumLike[] | null;
	},
	catalog?: Map<number, IumLike> | null
): string {
	const qRaw = (row.quantity ?? '').trim();
	if (!qRaw || qRaw === '—') return '—';
	const qNum = Number(qRaw);
	if (!Number.isFinite(qNum)) return qRaw;
	if (qNum < 0) return trimMetricQtyDisplay(qRaw);

	const ium = resolveIumForPurchaseQtyRow(row, catalog);
	const pf =
		ium?.purchaseConversionFactor != null
			? String(ium.purchaseConversionFactor)
			: '';
	const itf =
		ium?.issueConversionFactor != null
			? String(ium.issueConversionFactor)
			: '';
	if (!ium || !pf || !itf) {
		return trimMetricQtyDisplay(qRaw);
	}
	const issue = purchaseQtyStrToIssueQtyTrimmed(qRaw, pf, itf);
	const iu = (ium.issueUnitName ?? '').trim();
	const equiv = iu ? `${issue} ${iu}`.trim() : issue;
	return `${trimMetricQtyDisplay(qRaw)} (${equiv})`;
}

/** Detail GET responses that inline one resolved IUM per line (department indent / issue). */
export type DetailLineQtyRow = {
	quantity?: string | null;
	itemUnitMasterId?: number | null;
	purchaseConversionFactor?: string | null;
	issueConversionFactor?: string | null;
	issueUnitName?: string | null;
};

export function formatPurchaseQtyCellForDetailLine(
	row: DetailLineQtyRow
): string {
	const id = row.itemUnitMasterId;
	const pf = row.purchaseConversionFactor;
	const itf = row.issueConversionFactor;
	const iumList =
		id != null &&
		pf != null &&
		String(pf).trim() !== '' &&
		itf != null &&
		String(itf).trim() !== ''
			? [
					{
						id,
						purchaseConversionFactor: String(pf),
						issueConversionFactor: String(itf),
						issueUnitName: row.issueUnitName
					}
				]
			: undefined;
	return formatPurchaseQtyCellWithIssueEquivalent({
		quantity: row.quantity,
		itemUnitMasterId: id,
		iumList
	});
}
