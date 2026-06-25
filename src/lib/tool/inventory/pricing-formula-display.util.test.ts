import { describe, expect, it } from 'vitest';
import { buildPricingFormulaDisplay } from '$lib/tool/inventory/pricing-formula-display.util';

const labels = {
	baseSubtotal: 'subtotal',
	minusLineDiscount: '− line discount',
	minusInvoiceDiscount: '− invoice discount',
	plusLineTax: '+ line tax',
	plusInvoiceTax: '+ invoice tax',
	denomReceived: 'received qty',
	denomReceivedPlusFree: 'received qty + free qty',
	costEquals: 'cost =',
	priceEquals: 'price =',
	timesMsl: (p: string) => `× (1 + MSL ${p}%)`,
	timesItemMarkup: '× (1 + item markup %)',
	timesStoreMarkup: '× (1 + store markup %)'
};

describe('buildPricingFormulaDisplay', () => {
	it('includes all slots when enabled', () => {
		const r = buildPricingFormulaDisplay(
			{
				includeDiscount: true,
				includeTax: true,
				includeFreeQty: true,
				includeItemMarkup: true,
				includeStoreMarkup: true,
				mslMarkupPercent: '10'
			},
			labels
		);
		expect(r.costLine).toContain('− line discount');
		expect(r.costLine).toContain('− invoice discount');
		expect(r.costLine).toContain('+ line tax');
		expect(r.costLine).toContain('+ invoice tax');
		expect(r.costLine).toContain('free qty');
		expect(r.priceLine).toContain('MSL 10%');
		expect(r.priceLine).toContain('item markup');
		expect(r.priceLine).toContain('store markup');
	});

	it('omits disabled markup slots', () => {
		const r = buildPricingFormulaDisplay(
			{
				includeDiscount: false,
				includeTax: false,
				includeFreeQty: false,
				includeItemMarkup: false,
				includeStoreMarkup: false,
				mslMarkupPercent: '0'
			},
			labels
		);
		expect(r.costLine).toBe('cost = (subtotal) / received qty');
		expect(r.priceLine).toBe('price = cost × (1 + MSL 0%)');
	});
});
