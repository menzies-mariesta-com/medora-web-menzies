/** Inputs needed to render the sale-price formula (template flags + MSL). */
export type PricingFormulaDisplayInput = {
	includeDiscount: boolean;
	includeTax: boolean;
	includeFreeQty: boolean;
	includeItemMarkup: boolean;
	includeStoreMarkup: boolean;
	mslMarkupPercent: string;
};

export type PricingFormulaDisplayLabels = {
	baseSubtotal: string;
	minusLineDiscount: string;
	minusInvoiceDiscount: string;
	plusLineTax: string;
	plusInvoiceTax: string;
	denomReceived: string;
	denomReceivedPlusFree: string;
	costEquals: string;
	priceEquals: string;
	timesMsl: (percent: string) => string;
	timesItemMarkup: string;
	timesStoreMarkup: string;
};

export type PricingFormulaDisplayLines = {
	costLine: string;
	priceLine: string;
	summaryLine: string;
};

function formatMslPercent(raw: string): string {
	const n = Number(raw);
	return Number.isFinite(n) ? n.toFixed(2).replace(/\.?0+$/, '') : '0';
}

/** Builds human-readable cost and price formula lines from template settings. */
export function buildPricingFormulaDisplay(
	input: PricingFormulaDisplayInput,
	labels: PricingFormulaDisplayLabels
): PricingFormulaDisplayLines {
	let numerator = `(${labels.baseSubtotal}`;
	if (input.includeDiscount) {
		numerator += ` ${labels.minusLineDiscount}`;
		numerator += ` ${labels.minusInvoiceDiscount}`;
	}
	if (input.includeTax) {
		numerator += ` ${labels.plusLineTax}`;
		numerator += ` ${labels.plusInvoiceTax}`;
	}
	numerator += ')';

	const denominator = input.includeFreeQty
		? labels.denomReceivedPlusFree
		: labels.denomReceived;

	const costLine = `${labels.costEquals} ${numerator} / ${denominator}`;

	const mslPct = formatMslPercent(input.mslMarkupPercent);
	const priceSteps: string[] = [`${labels.timesMsl(mslPct)}`];
	if (input.includeItemMarkup) {
		priceSteps.push(labels.timesItemMarkup);
	}
	if (input.includeStoreMarkup) {
		priceSteps.push(labels.timesStoreMarkup);
	}

	const priceLine = `${labels.priceEquals} cost ${priceSteps.join(' ')}`;
	const summaryLine = `${costLine}; ${priceLine}`;

	return { costLine, priceLine, summaryLine };
}
