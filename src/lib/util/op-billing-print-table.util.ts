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
};

export function buildOpBillingPrintBodyHtml(opts: {
	groups: OpBillingPrintGroup[];
	grandTotal: number;
	discountValue: number;
	netTotal: number;
	hasDiscount: boolean;
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
      </div>`;
	}

	return `${rowsHtml}<div class="grand">
        <span>${totalLabel}</span>
        <span class="grand-amt">${opts.formatMoney(effectiveGrandTotal)}</span>
      </div>`;
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
