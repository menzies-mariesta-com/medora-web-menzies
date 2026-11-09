import {
	BillingStatusTaggingEnum,
	VisitTypeEnum
} from '$lib/model/enum/db-link';
import { DOCUMENT_PRINT_CODE } from '$lib/model/constant/document-print.constant';
import type { PatientOpenBillRow } from '$lib/model/type/medora/billing-context.type';
import type {
	OpBillingLine,
	OpBillingVisitLinesGetResponse,
	OpBillingVisitSummary
} from '$lib/model/type/medora/op-billing.type';
import { formatBillingCategorySubCategoryHeading } from '$lib/util/billing-group-heading.util';
import { printFromDocumentMaster } from '$lib/util/document-master-print.util.svelte';
import {
	buildMultiVisitBillsPrintBodyHtml,
	opBillingLineToPrintLine
} from '$lib/util/op-billing-print-table.util';
import {
	billingLineTotal,
	resolveVisitBillTotalsFromLinesResponse
} from '$lib/tool/billing/billing-visit-totals.util';
import { formatMoneyAmount } from '$lib/util/number-display.util';
import { sanitizeUserFacingErrorText } from '$lib/util/user-facing-error.util';

export type BillingLineGroup = {
	subCategoryId: number | null;
	categoryName: string | null;
	subCategoryName: string;
	groupHeading: string;
	lines: OpBillingLine[];
	subtotal: number;
};

export type OpenBillVisitDetail = {
	row: PatientOpenBillRow;
	data: OpBillingVisitLinesGetResponse;
	groups: BillingLineGroup[];
	grandTotal: number;
	discountValue: number;
	netTotal: number;
	hasDiscount: boolean;
	advanceTotal: number;
	advanceCredit: number;
	advanceRefundDue: number;
	balanceDue: number;
	payableAmount: number;
};

export type BillingPrintLabels = {
	service: string;
	order: string;
	qty: string;
	unit: string;
	unitPrice: string;
	amount: string;
	subtotal: string;
	grandTotal: string;
	discount: string;
	netTotal: string;
	allVisitsTotal: string;
	patient: string;
	patientCode: string;
	visitNo: string;
	date: string;
	doctor: string;
	branch: string;
	generated: string;
	thankYou: string;
	opTitle: string;
	ipTitle: string;
	advanceDeposit: string;
	appliedToBill: string;
	refundDue: string;
	balanceDue: string;
};

export { billingLineTotal };

export function groupBillingLines(
	lines: OpBillingLine[],
	otherLabel: string
): BillingLineGroup[] {
	const byKey: Record<string, BillingLineGroup> = {};
	for (const line of lines) {
		const key = String(line.subCategoryId ?? 'none');
		const name = (line.subCategoryName ?? otherLabel).trim() || otherLabel;
		const categoryName = (line.categoryName ?? '').trim() || null;
		let group = byKey[key];
		if (!group) {
			group = {
				subCategoryId: line.subCategoryId,
				categoryName,
				subCategoryName: name,
				groupHeading: formatBillingCategorySubCategoryHeading({
					categoryName,
					subCategoryName: name,
					fallbackSubCategory: otherLabel
				}),
				lines: [],
				subtotal: 0
			};
			byKey[key] = group;
		}
		group.lines.push(line);
		group.subtotal += billingLineTotal(line);
	}
	return Object.values(byKey).sort((a, b) =>
		a.groupHeading.localeCompare(b.groupHeading)
	);
}

function formatPrintDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	} catch {
		return '—';
	}
}

export async function fetchVisitLines(
	hospitalId: string,
	visitId: string
): Promise<OpBillingVisitLinesGetResponse> {
	const res = await fetch(
		`/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/billing/bill/visit-lines?visitId=${encodeURIComponent(visitId)}`,
		{ credentials: 'include' }
	);
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(
			sanitizeUserFacingErrorText(text, { status: res.status }) ||
				`Failed to load bill (${res.status})`
		);
	}
	return (await res.json()) as OpBillingVisitLinesGetResponse;
}

export function payableTotalForOpenBillDetail(
	d: OpenBillVisitDetail
): number {
	return d.payableAmount;
}

export function sumPayableOpenBillDetails(
	details: OpenBillVisitDetail[]
): string {
	let sum = 0;
	for (const d of details) sum += d.payableAmount;
	return sum.toFixed(2);
}

function detailFromRow(
	row: PatientOpenBillRow,
	data: OpBillingVisitLinesGetResponse,
	otherGroupLabel: string
): OpenBillVisitDetail {
	const groups = groupBillingLines(data.items ?? [], otherGroupLabel);
	const totals = resolveVisitBillTotalsFromLinesResponse(
		data,
		row.visitTypeId ?? null
	);
	return {
		row,
		data,
		groups,
		grandTotal: totals.linesSubtotal,
		discountValue: totals.discountValue,
		netTotal: totals.netTotal,
		hasDiscount: totals.hasDiscount,
		advanceTotal: totals.advanceTotal,
		advanceCredit: totals.advanceCredit,
		advanceRefundDue: totals.advanceRefundDue,
		balanceDue: totals.balanceDue,
		payableAmount: totals.payableAmount
	};
}

export async function fetchAllOpenBillVisitDetails(input: {
	hospitalId: string;
	rows: PatientOpenBillRow[];
	otherGroupLabel: string;
}): Promise<OpenBillVisitDetail[]> {
	const results = await Promise.all(
		input.rows.map(async (row) => {
			const data = await fetchVisitLines(input.hospitalId, row.visitId);
			return detailFromRow(row, data, input.otherGroupLabel);
		})
	);
	return results;
}

export function canCloseAllOpenBillDetails(
	details: OpenBillVisitDetail[]
): boolean {
	if (!details.length) return false;
	return details.every((d) => {
		const closed =
			d.data.billing?.statusTaggingId ===
			BillingStatusTaggingEnum.CLOSED;
		if (closed) return false;
		return Boolean(d.data.readiness?.canCloseBill);
	});
}

export async function closeOpenBillForVisit(input: {
	hospitalId: string;
	visitId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
	const res = await fetch(
		`/api/medora/hospital/${encodeURIComponent(input.hospitalId)}/home/billing/bill/visit-lines`,
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				action: 'close',
				visitId: input.visitId
			})
		}
	);
	if (!res.ok) {
		let message = '';
		try {
			const j = (await res.json()) as { message?: string };
			message =
				sanitizeUserFacingErrorText(
					typeof j?.message === 'string' ? j.message : undefined,
					{ status: res.status }
				) || '';
		} catch {
			// ignore
		}
		if (!message) {
			message =
				sanitizeUserFacingErrorText(await res.text().catch(() => ''), {
					status: res.status
				}) || `Close failed (${res.status})`;
		}
		return { ok: false, message };
	}
	return { ok: true };
}

export type BatchCloseResult = {
	closed: string[];
	failed: { visitId: string; visitNo: string | null; message: string }[];
};

export async function closeAllOpenBills(input: {
	hospitalId: string;
	rows: PatientOpenBillRow[];
}): Promise<BatchCloseResult> {
	const closed: string[] = [];
	const failed: BatchCloseResult['failed'] = [];
	for (const row of input.rows) {
		const result = await closeOpenBillForVisit({
			hospitalId: input.hospitalId,
			visitId: row.visitId
		});
		if (result.ok) {
			closed.push(row.visitId);
		} else {
			failed.push({
				visitId: row.visitId,
				visitNo: row.visitNo,
				message: result.message
			});
			break;
		}
	}
	return { closed, failed };
}

export async function printAllOpenBillsCombined(input: {
	hospitalId: string;
	details: OpenBillVisitDetail[];
	labels: BillingPrintLabels;
}): Promise<{ error?: string }> {
	const withLines = input.details.filter((d) => d.groups.length > 0);
	if (!withLines.length) {
		return { error: 'No billable lines to print.' };
	}

	const visitSections = withLines.map((d) => {
		const isIp = d.row.visitTypeId === VisitTypeEnum.IPD;
		const visitLabel =
			d.row.visitNo?.trim() ||
			d.data.visit?.visitNo?.trim() ||
			d.row.visitId.slice(0, 8);
		const billRef = d.row.billNo ? ` · ${d.row.billNo}` : '';
		const kindLabel = isIp ? input.labels.ipTitle : input.labels.opTitle;
		return {
			visitLabel: `${kindLabel} — ${visitLabel}${billRef}`,
			groups: d.groups.map((g) => ({
				subCategoryName: g.groupHeading,
				lines: g.lines.map((line) => opBillingLineToPrintLine(line)),
				subtotal: g.subtotal
			})),
			grandTotal: d.grandTotal,
			discountValue: d.discountValue,
			netTotal: d.netTotal,
			hasDiscount: d.hasDiscount,
			advanceDepositCollected: isIp ? d.advanceTotal : undefined,
			advanceAppliedToBill: isIp ? d.advanceCredit : undefined,
			advanceRefundDue: isIp ? d.advanceRefundDue : undefined,
			balanceDue: isIp ? d.payableAmount : undefined
		};
	});

	const bodyHtml = buildMultiVisitBillsPrintBodyHtml({
		visits: visitSections,
		labels: {
			service: input.labels.service,
			order: input.labels.order,
			qty: input.labels.qty,
			unit: input.labels.unit,
			unitPrice: input.labels.unitPrice,
			amount: input.labels.amount,
			subtotal: input.labels.subtotal,
			grandTotal: input.labels.grandTotal,
			discount: input.labels.discount,
			netTotal: input.labels.netTotal,
			advanceDeposit: input.labels.advanceDeposit,
			appliedToBill: input.labels.appliedToBill,
			refundDue: input.labels.refundDue,
			balanceDue: input.labels.balanceDue
		},
		formatMoney: formatMoneyAmount
	});

	const first = withLines[0]!;
	const v: OpBillingVisitSummary | null = first.data.visit ?? null;
	const visitNos = withLines
		.map(
			(d) =>
				d.row.visitNo?.trim() ||
				d.data.visit?.visitNo?.trim() ||
				d.row.visitId.slice(0, 8)
		)
		.join(', ');
	const hasIp = withLines.some(
		(d) => d.row.visitTypeId === VisitTypeEnum.IPD
	);
	const documentCode = hasIp
		? DOCUMENT_PRINT_CODE.IP_BILL
		: DOCUMENT_PRINT_CODE.OP_BILL;
	const printedAt = `${input.labels.generated}: ${new Date().toLocaleString()}`;

	await printFromDocumentMaster({
		hospitalId: input.hospitalId,
		documentCode,
		extraPlaceholders: {
			'{{patient.name}}': v?.patientName?.trim() || '—',
			'{{patient.code}}': v?.patientCode?.trim() || '—',
			'{{visit.no}}': visitNos || '—',
			'{{visit.date}}': formatPrintDate(v?.visitDateIso),
			'{{doctor.name}}': v?.doctorName?.trim() || '—',
			'{{visit.department}}': v?.branchName?.trim() || '—',
			'{{hospital.name}}':
				v?.hospitalName?.trim() ||
				(hasIp ? input.labels.ipTitle : input.labels.opTitle),
			'{{print.body_html}}': bodyHtml,
			'{{print.datetime}}': printedAt,
			'{{print.label_patient}}': input.labels.patient,
			'{{print.label_patient_code}}': input.labels.patientCode,
			'{{print.label_visit_no}}': input.labels.visitNo,
			'{{print.label_date}}': input.labels.date,
			'{{print.label_doctor}}': input.labels.doctor,
			'{{print.label_branch}}': input.labels.branch,
			'{{print.label_thank_you}}': input.labels.thankYou
		},
		iframeId: 'billing-all-visits-print-iframe'
	});

	return {};
}
