import { BillingDiscountTypeEnum } from '$lib/model/enum/billing-discount-type.enum';
import { BillingStatusTaggingEnum, VisitTypeEnum } from '$lib/model/enum/db-link';
import type {
	OpBillingLine,
	OpBillingMeta,
	OpBillingVisitLinesGetResponse
} from '$lib/model/type/medora/op-billing.type';

export function parseMoney(value: unknown): number | null {
	if (value == null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function billingLineQty(line: OpBillingLine): number {
	const unit = line.serviceUnit;
	if (unit != null && Number.isFinite(Number(unit)) && Number(unit) > 0) {
		return Number(unit);
	}
	return 1;
}

export function billingLineUnitPrice(line: OpBillingLine): number {
	return Number(line.serviceAmount ?? 0) || 0;
}

export function billingLineTotal(line: OpBillingLine): number {
	const amount = Number(line.serviceAmount ?? 0) || 0;
	const tax = Number(line.serviceTaxAmount ?? 0) || 0;
	const discount = Number(line.discount ?? 0) || 0;
	const unit = billingLineQty(line);
	return Math.round((amount + tax - discount) * unit * 100) / 100;
}

export type VisitBillTotals = {
	linesSubtotal: number;
	discountValue: number;
	netTotal: number;
	hasDiscount: boolean;
	advanceTotal: number;
	/** Amount of advance applied to this bill (min(deposit, net)). */
	advanceCredit: number;
	/** Excess advance when deposit exceeds net bill (refund due). */
	advanceRefundDue: number;
	balanceDue: number;
	payableAmount: number;
};

function discountFromMetaWhenNoHeader(
	linesSubtotal: number,
	billing: OpBillingMeta | null
): { discountValue: number; netTotal: number; hasDiscount: boolean } {
	if (!billing || linesSubtotal <= 0) {
		return { discountValue: 0, netTotal: linesSubtotal, hasDiscount: false };
	}
	const typeId = billing.discountTypeId ?? BillingDiscountTypeEnum.NONE;
	if (typeId === BillingDiscountTypeEnum.NONE) {
		return { discountValue: 0, netTotal: linesSubtotal, hasDiscount: false };
	}
	if (typeId === BillingDiscountTypeEnum.PERCENT) {
		const pct = Math.min(
			100,
			Math.max(0, Number(billing.discountPercent ?? 0) || 0)
		);
		const discountValue = Math.min(
			linesSubtotal,
			Math.round(((linesSubtotal * pct) / 100) * 100) / 100
		);
		return {
			discountValue,
			netTotal: Math.max(0, linesSubtotal - discountValue),
			hasDiscount: discountValue > 0
		};
	}
	const discountValue = Math.min(
		linesSubtotal,
		Math.max(0, Number(billing.discountAmount ?? 0) || 0)
	);
	return {
		discountValue,
		netTotal: Math.max(0, linesSubtotal - discountValue),
		hasDiscount: discountValue > 0
	};
}

/** Single source of truth for bill math (matches IP visit-lines GET). */
export function resolveVisitBillTotals(input: {
	itemsSubtotal: number;
	billing: OpBillingMeta | null;
	visitTypeId?: number | null;
	advanceTotal?: number;
	advanceCredit?: number | null;
	balanceDue?: number | null;
	advanceRefundDue?: number | null;
}): VisitBillTotals {
	const itemsSubtotal = Math.round((input.itemsSubtotal || 0) * 100) / 100;
	const headerSubtotal = parseMoney(input.billing?.linesSubtotal);
	const linesSubtotal = headerSubtotal ?? itemsSubtotal;

	const headerNet = parseMoney(input.billing?.totalAmount);
	const headerDiscount = parseMoney(input.billing?.discountAmount);

	let discountValue: number;
	let netTotal: number;
	let hasDiscount: boolean;

	if (headerNet != null) {
		netTotal = headerNet;
		discountValue = headerDiscount ?? Math.max(0, linesSubtotal - netTotal);
		hasDiscount = discountValue > 0;
	} else {
		const computed = discountFromMetaWhenNoHeader(linesSubtotal, input.billing);
		discountValue = computed.discountValue;
		netTotal = computed.netTotal;
		hasDiscount = computed.hasDiscount;
	}

	const isIp = input.visitTypeId === VisitTypeEnum.IPD;
	const advanceTotal = isIp
		? Math.round((Number(input.advanceTotal ?? 0) || 0) * 100) / 100
		: 0;

	const billClosed =
		input.billing?.statusTaggingId === BillingStatusTaggingEnum.CLOSED;

	let advanceCredit = 0;
	let balanceDue = netTotal;

	if (isIp && advanceTotal > 0) {
		const creditFromApi = parseMoney(input.advanceCredit);
		const balanceFromApi = parseMoney(input.balanceDue);
		if (billClosed && creditFromApi != null) {
			advanceCredit = creditFromApi;
		} else if (creditFromApi != null) {
			advanceCredit = creditFromApi;
		} else {
			advanceCredit = Math.min(advanceTotal, Math.max(0, netTotal));
		}
		if (balanceFromApi != null) {
			balanceDue = balanceFromApi;
		} else {
			balanceDue =
				Math.round((netTotal - advanceCredit) * 100) / 100;
		}
	}

	const payableAmount = isIp ? Math.max(0, balanceDue) : netTotal;
	const refundFromApi = parseMoney(input.advanceRefundDue);
	const advanceRefundDue =
		refundFromApi != null
			? Math.max(0, refundFromApi)
			: isIp && advanceTotal > advanceCredit
				? Math.round((advanceTotal - advanceCredit) * 100) / 100
				: 0;

	return {
		linesSubtotal,
		discountValue,
		netTotal,
		hasDiscount,
		advanceTotal,
		advanceCredit,
		advanceRefundDue,
		balanceDue: Math.max(0, balanceDue),
		payableAmount
	};
}

export function resolveVisitBillTotalsFromLinesResponse(
	data: OpBillingVisitLinesGetResponse,
	visitTypeId: number | null
): VisitBillTotals {
	const itemsSubtotal = (data.items ?? []).reduce(
		(sum, line) => sum + billingLineTotal(line),
		0
	);
	const isIp = visitTypeId === VisitTypeEnum.IPD;
	return resolveVisitBillTotals({
		itemsSubtotal,
		billing: data.billing ?? null,
		visitTypeId,
		advanceTotal: isIp ? data.advanceTotal : undefined,
		advanceCredit: isIp ? data.advanceCredit : undefined,
		balanceDue: isIp ? data.balanceDue : undefined,
		advanceRefundDue: isIp ? data.advanceRefundDue : undefined
	});
}

export function payableAmountForLinesResponse(
	data: OpBillingVisitLinesGetResponse,
	visitTypeId: number | null
): number {
	return resolveVisitBillTotalsFromLinesResponse(data, visitTypeId)
		.payableAmount;
}

/** Net bill after discount, before IP advance (for scope row sub-labels). */
export function netBillAmountFromDraftTotal(draftTotal: string): number {
	return parseMoney(draftTotal) ?? 0;
}

/** IP payable from stored bill net and deposit sum (open bills list). */
export function ipPayableFromNetAndDeposit(
	netAfterDiscount: number,
	depositSum: number
): number {
	const net = Math.max(0, netAfterDiscount);
	const credit = Math.min(Math.max(0, depositSum), net);
	return Math.round((net - credit) * 100) / 100;
}
