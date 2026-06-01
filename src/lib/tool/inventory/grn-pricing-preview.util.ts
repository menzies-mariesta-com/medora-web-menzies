import type {
	BranchPricingConfigDto,
	GrnLinePriceInput,
	GrnLinePriceResult
} from '$lib/model/type/heka/grn-pricing-config.type';
import { computeGrnLinePrices } from '$lib/tool/inventory/grn-pricing.util';

/** Client-safe GRN line price preview (returns null when manual overrides missing). */
export function computeGrnLinePricesPreview(
	config: BranchPricingConfigDto,
	line: GrnLinePriceInput
): GrnLinePriceResult | null {
	const out = computeGrnLinePrices(config, line);
	return out.ok ? out.result : null;
}
