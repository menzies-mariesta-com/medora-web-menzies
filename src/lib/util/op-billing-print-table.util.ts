function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export type OpBillingPrintLine = {
	serviceName?: string | null;
	orderNo?: string | null;
	lineTotal: number;
};

export type OpBillingPrintGroup = {
	subCategoryName: string;
	lines: OpBillingPrintLine[];
	subtotal: number;
};

export type OpBillingPrintLabels = {
	service: string;
	order: string;
	amount: string;
	subtotal: string;
	grandTotal: string;
	discount: string;
	netTotal: string;
	advanceDeposit?: string;
	appliedToBill?: string;
	refundDue?: string;
	balanceDue?: string;
};

function depositFooterHtml(opts: {
	advanceCollected: number;
	advanceApplied: number;
	refundDue: number;
	balanceDue: number;
	labels: OpBillingPrintLabels;
	formatMoney: (amount: number) => string;
}): string {
	if (opts.advanceCollected <= 0) return '';
	const collectedLabel = escapeHtml(
		opts.labels.advanceDeposit ?? 'Advance deposit (collected)'
	);
	const appliedLabel = escapeHtml(
		opts.labels.appliedToBill ?? 'Applied to bill'
	);
	const refundLabel = escapeHtml(opts.labels.refundDue ?? 'Refund due');
	const balanceLabel = escapeHtml(opts.labels.balanceDue ?? 'Balance due');

	const refundRow =
		opts.refundDue > 0
			? `<div class="grand-row">
          <span>${refundLabel}</span>
          <span class="grand-amt">${opts.formatMoney(opts.refundDue)}</span>
        </div>`
			: '';

	return `<div class="grand grand--stack">
        <div class="grand-row">
          <span>${collectedLabel}</span>
          <span class="grand-amt">${opts.formatMoney(opts.advanceCollected)}</span>
        </div>
        <div class="grand-row">
          <span>${appliedLabel}</span>
          <span class="grand-disc">−${opts.formatMoney(opts.advanceApplied)}</span>
        </div>
        ${refundRow}
        <div class="grand-row grand-row--net">
          <span>${balanceLabel}</span>
          <span class="grand-amt">${opts.formatMoney(opts.balanceDue)}</span>
        </div>
      </div>`;
}

export function buildOpBillingPrintBodyHtml(opts: {
	groups: OpBillingPrintGroup[];
	grandTotal: number;
	discountValue: number;
	netTotal: number;
	hasDiscount: boolean;
	/** Full advance collected (IP). */
	advanceDepositCollected?: number;
	/** Portion applied to this bill. */
	advanceAppliedToBill?: number;
	advanceRefundDue?: number;
	balanceDue?: number;
	labels: OpBillingPrintLabels;
	formatMoney: (amount: number) => string;
}): string {
	const rowsHtml = opts.groups
		.map((g) => {
			const lineRows = g.lines
				.map(
					(line) => `
          <tr>
            <td class="svc">${escapeHtml(line.serviceName ?? 'Service')}</td>
            <td class="ord">${escapeHtml(line.orderNo ?? '—')}</td>
            <td class="amt">${opts.formatMoney(line.lineTotal)}</td>
          </tr>`
				)
				.join('');

			return `
        <section class="cat-block">
          <h3 class="cat-title">${escapeHtml(g.subCategoryName)}</h3>
          <table class="line-table">
            <thead>
              <tr>
                <th>${escapeHtml(opts.labels.service)}</th>
                <th>${escapeHtml(opts.labels.order)}</th>
                <th class="num">${escapeHtml(opts.labels.amount)}</th>
              </tr>
            </thead>
            <tbody>
              ${lineRows}
            </tbody>
            <tfoot>
              <tr class="subtotal-row">
                <td colspan="2">${escapeHtml(opts.labels.subtotal)}</td>
                <td class="num">${opts.formatMoney(g.subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </section>`;
		})
		.join('');

	const totalLabel = escapeHtml(opts.labels.grandTotal);
	const discountLabel = escapeHtml(opts.labels.discount);
	const netLabel = escapeHtml(opts.labels.netTotal);
	const effectiveGrandTotal = opts.hasDiscount
		? opts.netTotal
		: opts.grandTotal;
	const advanceCollected =
		Number(opts.advanceDepositCollected ?? 0) || 0;
	const advanceApplied =
		opts.advanceAppliedToBill != null &&
		Number.isFinite(opts.advanceAppliedToBill)
			? opts.advanceAppliedToBill
			: advanceCollected > 0
				? Math.min(advanceCollected, effectiveGrandTotal)
				: 0;
	const refundDue =
		opts.advanceRefundDue != null && Number.isFinite(opts.advanceRefundDue)
			? Math.max(0, opts.advanceRefundDue)
			: Math.max(0, advanceCollected - advanceApplied);
	const balanceDue =
		opts.balanceDue != null && Number.isFinite(opts.balanceDue)
			? opts.balanceDue
			: advanceCollected > 0
				? Math.max(0, effectiveGrandTotal - advanceApplied)
				: effectiveGrandTotal;
	const depositBlock =
		advanceCollected > 0
			? depositFooterHtml({
					advanceCollected,
					advanceApplied,
					refundDue,
					balanceDue,
					labels: opts.labels,
					formatMoney: opts.formatMoney
				})
			: '';

	if (opts.hasDiscount) {
		return `${rowsHtml}<div class="grand grand--stack">
        <div class="grand-row">
          <span>${totalLabel}</span>
          <span class="grand-amt grand-amt--strike">${opts.formatMoney(opts.grandTotal)}</span>
        </div>
        <div class="grand-row">
          <span>${discountLabel}</span>
          <span class="grand-disc">-${opts.formatMoney(opts.discountValue)}</span>
        </div>
        <div class="grand-row grand-row--net">
          <span>${netLabel}</span>
          <span class="grand-amt">${opts.formatMoney(effectiveGrandTotal)}</span>
        </div>
      </div>${depositBlock}`;
	}

	return `${rowsHtml}<div class="grand">
        <span>${totalLabel}</span>
        <span class="grand-amt">${opts.formatMoney(effectiveGrandTotal)}</span>
      </div>${depositBlock}`;
}

/** One print job: full bill per visit, page break between visits (no combined total). */
export function buildMultiVisitBillsPrintBodyHtml(opts: {
	visits: Array<{
		visitLabel: string;
		groups: OpBillingPrintGroup[];
		grandTotal: number;
		discountValue: number;
		netTotal: number;
		hasDiscount: boolean;
		advanceDepositCollected?: number;
		advanceAppliedToBill?: number;
		advanceRefundDue?: number;
		balanceDue?: number;
	}>;
	labels: OpBillingPrintLabels;
	formatMoney: (amount: number) => string;
}): string {
	return opts.visits
		.map((v, i) => {
			const inner = buildOpBillingPrintBodyHtml({
				groups: v.groups,
				grandTotal: v.grandTotal,
				discountValue: v.discountValue,
				netTotal: v.netTotal,
				hasDiscount: v.hasDiscount,
				advanceDepositCollected: v.advanceDepositCollected,
				advanceAppliedToBill: v.advanceAppliedToBill,
				advanceRefundDue: v.advanceRefundDue,
				balanceDue: v.balanceDue,
				labels: opts.labels,
				formatMoney: opts.formatMoney
			});
			const breakAfter =
				i < opts.visits.length - 1
					? ' style="page-break-after: always;"'
					: '';
			return `<div class="visit-block"${breakAfter}><h2 class="visit-title" style="font-size: 1rem; margin: 0 0 0.5rem;">${escapeHtml(v.visitLabel)}</h2>${inner}</div>`;
		})
		.join('');
}

export type MedOrderReceiptPrintLine = {
	itemName?: string | null;
	qtyOut: string | number;
	unitSalePrice: string | number;
	lineTotal: string | number;
};

export type MedOrderReceiptPrintLabels = {
	item: string;
	qty: string;
	price: string;
	total: string;
	amountDue: string;
	amountPaid: string;
};

export function buildMedOrderReceiptBodyHtml(opts: {
	lines: MedOrderReceiptPrintLine[];
	amountDue: string | number;
	amountPaid: string | number;
	labels: MedOrderReceiptPrintLabels;
}): string {
	const rows = opts.lines
		.map(
			(ln) =>
				`<tr><td>${escapeHtml(String(ln.itemName ?? '—'))}</td><td>${escapeHtml(String(ln.qtyOut))}</td><td>${escapeHtml(String(ln.unitSalePrice))}</td><td>${escapeHtml(String(ln.lineTotal))}</td></tr>`
		)
		.join('');

	return `<table class="receipt-table">
<thead><tr><th>${escapeHtml(opts.labels.item)}</th><th>${escapeHtml(opts.labels.qty)}</th><th>${escapeHtml(opts.labels.price)}</th><th>${escapeHtml(opts.labels.total)}</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<p class="receipt-totals">${escapeHtml(opts.labels.amountDue)}: ${escapeHtml(String(opts.amountDue))} · ${escapeHtml(opts.labels.amountPaid)}: ${escapeHtml(String(opts.amountPaid))}</p>`;
}
