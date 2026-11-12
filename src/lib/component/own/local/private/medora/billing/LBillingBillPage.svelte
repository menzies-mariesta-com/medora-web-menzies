<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import LIpdVisitRequiredAlert from '$lib/component/own/local/private/medora/visit/LIpdVisitRequiredAlert.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import LucideStrikeThrough from '$lib/component/own/library/lucide/LucideStrikeThrough.svelte';
	import OpBillingReadinessPanel from '$lib/component/own/local/private/medora/billing/OpBillingReadinessPanel.svelte';
	import BillingBillLineRows from '$lib/component/own/local/private/medora/billing/BillingBillLineRows.svelte';
	import { m } from '$lib/paraglide/messages';
	import { BillingDiscountTypeEnum } from '$lib/model/enum/billing-discount-type.enum';
	import {
		BillingStatusTaggingEnum,
		VisitTypeEnum
	} from '$lib/model/enum/db-link';
	import type {
		OpBillingLine,
		OpBillingMeta,
		OpBillingReadiness,
		OpBillingStaffSummary,
		OpBillingVisitLinesGetResponse,
		OpBillingVisitSummary
	} from '$lib/model/type/medora/op-billing.type';
	import { DOCUMENT_PRINT_CODE } from '$lib/model/constant/document-print.constant';
	import { printFromDocumentMaster } from '$lib/util/document-master-print.util.svelte';
	import {
		buildOpBillingPrintBodyHtml,
		opBillingLineToPrintLine
	} from '$lib/util/op-billing-print-table.util';
	import { formatBillingCategorySubCategoryHeading } from '$lib/util/billing-group-heading.util';
	import { formatMoneyAmount } from '$lib/util/number-display.util';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { sanitizeUserFacingErrorText } from '$lib/util/user-facing-error.util';
	import LBillingAllVisitsPanel from '$lib/component/own/local/private/medora/billing/LBillingAllVisitsPanel.svelte';
	import {
		canCloseAllOpenBillDetails,
		closeAllOpenBills,
		fetchAllOpenBillVisitDetails,
		printAllOpenBillsCombined,
		sumPayableOpenBillDetails,
		type BillingPrintLabels,
		type OpenBillVisitDetail
	} from '$lib/tool/billing/billing-open-bills-batch.util.svelte';
	import {
		resolveVisitBillTotalsFromLinesResponse,
		type VisitBillTotals
	} from '$lib/tool/billing/billing-visit-totals.util';

	let {
		visitTypeId,
		billingViewAll = $bindable(false),
		openBillDetails = $bindable([] as OpenBillVisitDetail[]),
		openBillDetailsLoading = false,
		openBillsGrandTotal = $bindable('0')
	}: {
		visitTypeId: number | null;
		billingViewAll?: boolean;
		openBillDetails?: OpenBillVisitDetail[];
		openBillDetailsLoading?: boolean;
		openBillsGrandTotal?: string;
	} = $props();

	let closeAllConfirmOpen = $state(false);
	let closeAllWorking = $state(false);
	let discountTargetVisitId = $state<string | null>(null);

	const msg = m as Record<
		string,
		(inputs?: Record<string, unknown>) => string
	>;

	const visitId = $derived(VisitState.visitId);
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const isIpBilling = $derived(visitTypeId === VisitTypeEnum.IPD);
	const billingUiKey = $derived(
		isIpBilling ? 'ip-billing' : visitTypeId === VisitTypeEnum.ED ? 'er-billing' : 'op-billing'
	);
	const billApiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/billing/bill`
			: ''
	);

	function bm(key: string) {
		return msg[`${isIpBilling ? 'ip' : 'op'}_billing_${key}`];
	}

	function bmForVisitType(
		visitTypeId: number | null | undefined,
		key: string
	) {
		const isIp = visitTypeId === VisitTypeEnum.IPD;
		return msg[`${isIp ? 'ip' : 'op'}_billing_${key}`];
	}
	const printDocumentCode = $derived(
		isIpBilling
			? DOCUMENT_PRINT_CODE.IP_BILL
			: DOCUMENT_PRINT_CODE.OP_BILL
	);
	const printIframeId = $derived(
		isIpBilling ? 'ip-billing-print-iframe' : 'op-billing-print-iframe'
	);

	function tr(
		getter: (() => string) | undefined,
		fallback: string
	): string {
		try {
			return typeof getter === 'function' ? getter() : fallback;
		} catch {
			return fallback;
		}
	}

	type BillingLine = OpBillingLine;

	type BillingGroup = {
		subCategoryId: number | null;
		categoryName: string | null;
		subCategoryName: string;
		groupHeading: string;
		lines: BillingLine[];
		subtotal: number;
	};

	type VisitSummary = OpBillingVisitSummary;

	type StaffSummary = OpBillingStaffSummary;

	type BillingMeta = OpBillingMeta;

	type BillingHistory = {
		id: number;
		billNo: string | null;
		createdAt: string;
		updatedAt: string | null;
		statusTaggingId: number | null;
		printedAt: string | null;
		linesSubtotal: string | number | null;
		discountAmount: string | number | null;
		totalAmount: string | number | null;
		discountedByStaff?: StaffSummary | null;
		printedByStaff?: StaffSummary | null;
	};

	type BillingDetailLine = {
		id: number;
		serviceId: number;
		serviceName: string | null;
		orderNo: string | null;
		subCategoryId: number | null;
		subCategoryName: string | null;
		categoryName: string | null;
		serviceAmount: string | number | null;
		serviceTaxAmount: string | number | null;
		discount: string | number | null;
		serviceUnit: number | null;
		lineTotal: string | number | null;
	};

	let isLoading = $state(false);
	let loadError = $state('');
	let groups = $state<BillingGroup[]>([]);
	/** Ignore stale overlapping visit-lines fetches. */
	let billingLinesLoadSeq = 0;
	let grandTotal = $state(0);
	let visitSummary = $state<VisitSummary | null>(null);
	let billingMeta = $state<BillingMeta | null>(null);
	let billingReadiness = $state<OpBillingReadiness | null>(null);
	let advanceTotal = $state(0);
	let balanceDuePreview = $state(0);
	let visitBillTotals = $state<VisitBillTotals | null>(null);

	let isDiscountModalOpen = $state(false);
	let discountType = $state<BillingDiscountTypeEnum>(
		BillingDiscountTypeEnum.NONE
	);
	let discountInput = $state('');

	let isHistoryModalOpen = $state(false);
	let historyLoading = $state(false);
	let historyError = $state('');
	let historyBills = $state<BillingHistory[]>([]);
	let historyPrintLoadingId = $state<number | null>(null);

	const discountInputNumber = $derived.by(() => {
		const raw = Number(discountInput);
		return Number.isFinite(raw) ? raw : 0;
	});

	const discountTargetDetail = $derived.by(() => {
		if (!discountTargetVisitId) return null;
		return (
			openBillDetails.find(
				(d) => d.row.visitId === discountTargetVisitId
			) ?? null
		);
	});

	const discountPreviewBaseTotal = $derived.by(() => {
		if (discountTargetDetail) return discountTargetDetail.grandTotal;
		return grandTotal;
	});

	function discountAmountForTotal(total: number): number {
		if (total <= 0) return 0;
		if (discountType === BillingDiscountTypeEnum.PERCENT) {
			const pct = Math.min(100, Math.max(0, discountInputNumber));
			return Math.min(total, (total * pct) / 100);
		}
		if (discountType === BillingDiscountTypeEnum.FIXED_AMOUNT) {
			const amt = Math.max(0, discountInputNumber);
			return Math.min(total, amt);
		}
		return 0;
	}

	const discountValue = $derived.by(() =>
		discountAmountForTotal(Number(grandTotal) || 0)
	);

	const discountPreviewValue = $derived.by(() =>
		discountAmountForTotal(Number(discountPreviewBaseTotal) || 0)
	);

	const netTotal = $derived.by(() => {
		if (visitBillTotals) return visitBillTotals.netTotal;
		const total = Number(grandTotal) || 0;
		return Math.max(0, total - discountValue);
	});

	const linesSubtotalDisplay = $derived(
		visitBillTotals?.linesSubtotal ?? grandTotal
	);
	const advanceCreditDisplay = $derived(
		visitBillTotals?.advanceCredit ??
			(isIpBilling
				? Math.min(advanceTotal, Math.max(0, netTotal))
				: 0)
	);
	const advanceCollectedDisplay = $derived(
		visitBillTotals?.advanceTotal ?? advanceTotal
	);
	const advanceAppliedDisplay = $derived(advanceCreditDisplay);
	const advanceRefundDisplay = $derived(
		visitBillTotals?.advanceRefundDue ??
			Math.max(0, advanceCollectedDisplay - advanceAppliedDisplay)
	);
	const payableDisplay = $derived(
		visitBillTotals?.payableAmount ??
			(isIpBilling && advanceTotal > 0
				? balanceDuePreview > 0
					? balanceDuePreview
					: Math.max(0, netTotal - advanceCreditDisplay)
				: netTotal)
	);
	const hasDiscountDisplay = $derived(
		visitBillTotals?.hasDiscount ?? hasDiscount
	);
	const discountValueDisplay = $derived(
		visitBillTotals?.discountValue ?? discountValue
	);

	const discountPreviewNetTotal = $derived.by(() => {
		const total = Number(discountPreviewBaseTotal) || 0;
		return Math.max(0, total - discountPreviewValue);
	});

	/** Bill was closed; discount is frozen for that bill. */
	const visitLevelDiscountLocked = $derived.by(() => {
		return (
			billingMeta?.statusTaggingId === BillingStatusTaggingEnum.CLOSED
		);
	});

	const discountModalLocked = $derived.by(() => {
		if (discountTargetDetail) {
			return (
				discountTargetDetail.data.billing?.statusTaggingId ===
				BillingStatusTaggingEnum.CLOSED
			);
		}
		return visitLevelDiscountLocked;
	});

	function trForDiscountModal(key: string, fallback: string): string {
		const typeId =
			discountTargetDetail?.row.visitTypeId ?? visitTypeId;
		const getter = discountTargetDetail
			? bmForVisitType(typeId, key)
			: bm(key);
		return tr(getter, fallback);
	}

	const hasDiscount = $derived(discountValue > 0);

	const canCloseBill = $derived(
		Boolean(billingReadiness?.canCloseBill) &&
			!visitLevelDiscountLocked
	);

	function closeBlockedTooltip(): string {
		if (visitLevelDiscountLocked) {
			return tr(bm('bill_already_closed_tooltip'), 'Bill is already closed.');
		}
		const key = billingReadiness?.blockReasonKey ?? null;
		switch (key) {
			case 'nursing_incomplete':
				return tr(
					bm('bill_close_blocked_nursing'),
					'Complete nursing before closing the bill.'
				);
			case 'no_billable_lines':
				return tr(
					bm('bill_close_blocked_no_lines'),
					'Bill has no billable lines.'
				);
			case 'visit_not_discharged':
				return isIpBilling
					? 'Patient must be discharged before closing the IP bill.'
					: tr(bm('readiness_not_ready'), 'Not ready to close.');
			default:
				return tr(bm('readiness_not_ready'), 'Not ready to close.');
		}
	}

	function opBillingLineRowKey(line: BillingLine): string {
		if (line.lineSource === 'billing_setup') {
			return `billing_setup-${line.id}`;
		}
		if (
			line.lineSource === 'medication_order_line' ||
			line.lineSource === 'service_order_detail' ||
			(!isIpBilling && line.lineSource === 'department_consumption_line')
		) {
			return `${line.lineSource}-${line.id}`;
		}
		return `row-${line.id}`;
	}

	function lineTotal(line: BillingLine): number {
		const amount = Number(line.serviceAmount ?? 0) || 0;
		const tax = Number(line.serviceTaxAmount ?? 0) || 0;
		const discount = Number(line.discount ?? 0) || 0;
		const unit =
			line.serviceUnit && line.serviceUnit > 0 ? line.serviceUnit : 1;
		return (amount + tax - discount) * unit;
	}

	function groupLines(lines: BillingLine[]): BillingGroup[] {
		const byKey: Record<string, BillingGroup> = {};

		for (const line of lines) {
			const key = String(line.subCategoryId ?? 'none');
			const other = tr(bm('group_other'), 'Other');
			const name = (line.subCategoryName ?? other).trim() || other;
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
						fallbackSubCategory: other
					}),
					lines: [],
					subtotal: 0
				};
				byKey[key] = group;
			}
			group.lines.push(line);
			group.subtotal += lineTotal(line);
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

	function staffDisplayName(
		staff: StaffSummary | null | undefined
	): string {
		if (!staff) return '';
		const parts = [
			staff.title?.name?.trim() || '',
			staff.firstName?.trim() || '',
			staff.middleName?.trim() || '',
			staff.lastName?.trim() || ''
		].filter(Boolean);
		const name = parts.join(' ').trim();
		if (name) return name;
		return String(staff.userId ?? staff.id ?? '').trim();
	}

	async function postBillingUpdate(
		payload: Record<string, unknown>
	) {
		const res = await fetch(`${billApiBase}/visit-lines`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		return res;
	}

	async function loadBillingLines(currentVisitId: string | null) {
		if (!currentVisitId) {
			groups = [];
			grandTotal = 0;
			visitSummary = null;
			billingMeta = null;
			billingReadiness = null;
			advanceTotal = 0;
			balanceDuePreview = 0;
			visitBillTotals = null;
			loadError = '';
			return;
		}

		const visitNumeric = parseUuid(currentVisitId) ?? '';
		if (
			!visitNumeric
		) {
			groups = [];
			grandTotal = 0;
			visitSummary = null;
			billingMeta = null;
			billingReadiness = null;
			advanceTotal = 0;
			balanceDuePreview = 0;
			visitBillTotals = null;
			loadError = '';
			return;
		}

		const requestSeq = ++billingLinesLoadSeq;
		isLoading = true;
		loadError = '';
		try {
			const res = await fetch(
				`${billApiBase}/visit-lines?visitId=${visitNumeric}`
			);
			if (requestSeq !== billingLinesLoadSeq) return;
			if (!res.ok) {
				groups = [];
				grandTotal = 0;
				visitSummary = null;
				billingMeta = null;
				billingReadiness = null;
				advanceTotal = 0;
				balanceDuePreview = 0;
				visitBillTotals = null;
				loadError = tr(
					bm('load_failed'),
					'Failed to load billing lines.'
				);
				return;
			}
			const data =
				(await res.json()) as OpBillingVisitLinesGetResponse & {
					advanceTotal?: number;
					balanceDue?: number;
				};
			if (requestSeq !== billingLinesLoadSeq) return;
			const lines = (data.items ?? []).map((row) => ({
				...row
			}));
			visitSummary = data.visit ?? null;
			billingMeta = data.billing ?? null;
			billingReadiness = data.readiness ?? null;
			const grouped = groupLines(lines);
			groups = grouped;
			visitBillTotals = resolveVisitBillTotalsFromLinesResponse(
				data,
				visitTypeId ?? null
			);
			grandTotal = visitBillTotals.linesSubtotal;
			if (isIpBilling) {
				advanceTotal = visitBillTotals.advanceTotal;
				balanceDuePreview = visitBillTotals.balanceDue;
			} else {
				advanceTotal = 0;
				balanceDuePreview = 0;
			}

			const b = data.billing ?? null;
			if (
				!b?.discountTypeId ||
				b.discountTypeId === BillingDiscountTypeEnum.NONE
			) {
				discountType = BillingDiscountTypeEnum.NONE;
				discountInput = '';
			} else if (
				b.discountTypeId === BillingDiscountTypeEnum.PERCENT
			) {
				discountType = BillingDiscountTypeEnum.PERCENT;
				const pct = Number(b.discountPercent ?? 0);
				discountInput =
					Number.isFinite(pct) && pct > 0 ? String(pct) : '';
			} else if (
				b.discountTypeId === BillingDiscountTypeEnum.FIXED_AMOUNT
			) {
				discountType = BillingDiscountTypeEnum.FIXED_AMOUNT;
				const amt = Number(b.discountAmount ?? 0);
				discountInput =
					Number.isFinite(amt) && amt > 0 ? String(amt) : '';
			}
		} catch (err) {
			if (requestSeq !== billingLinesLoadSeq) return;
			console.error(err);
			groups = [];
			grandTotal = 0;
			visitSummary = null;
			billingMeta = null;
			billingReadiness = null;
			advanceTotal = 0;
			balanceDuePreview = 0;
			visitBillTotals = null;
			loadError = tr(
				bm('load_failed'),
				'Failed to load billing lines.'
			);
		} finally {
			if (requestSeq === billingLinesLoadSeq) {
				isLoading = false;
			}
		}
	}

	async function applyDiscount() {
		if (billingViewAll && !discountTargetVisitId) return;
		const targetVisitId = discountTargetVisitId ?? visitId;
		if (!targetVisitId) return;
		if (!billingViewAll && !billingMeta) return;
		if (discountModalLocked) return;
		const visitNumeric = parseUuid(targetVisitId) ?? '';
		if (!visitNumeric) return;

		if (discountTargetDetail) {
			if (
				discountTargetDetail.data.billing?.statusTaggingId ===
				BillingStatusTaggingEnum.CLOSED
			) {
				return;
			}
		}

		const payload =
			discountType === BillingDiscountTypeEnum.PERCENT
				? {
						action: 'discount',
						visitId: visitNumeric,
						discountTypeId: BillingDiscountTypeEnum.PERCENT,
						discountPercent: Math.min(
							100,
							Math.max(0, discountInputNumber)
						),
						discountAmount: 0
					}
				: discountType === BillingDiscountTypeEnum.FIXED_AMOUNT
					? {
							action: 'discount',
							visitId: visitNumeric,
							discountTypeId: BillingDiscountTypeEnum.FIXED_AMOUNT,
							discountPercent: 0,
							discountAmount: Math.max(0, discountInputNumber)
						}
					: {
							action: 'discount',
							visitId: visitNumeric,
							discountTypeId: BillingDiscountTypeEnum.NONE,
							discountPercent: 0,
							discountAmount: 0
						};

		try {
			const res = await postBillingUpdate(payload);
			if (!res.ok) {
				if (res.status === 403) {
					try {
						const j = (await res.json()) as { message?: string };
						loadError =
							sanitizeUserFacingErrorText(
								typeof j?.message === 'string' ? j.message : undefined,
								{ status: res.status }
							) ||
							tr(
								bm('discount_locked_after_print'),
								'This bill was printed; the visit-level discount cannot be changed.'
							);
					} catch {
						loadError = tr(
							bm('discount_locked_after_print'),
							'This bill was printed; the visit-level discount cannot be changed.'
						);
					}
				} else {
					loadError = tr(
						bm('discount_save_failed'),
						'Failed to save discount.'
					);
				}
				return;
			}
			isDiscountModalOpen = false;
			discountTargetVisitId = null;
			if (billingViewAll) {
				await reloadOpenBillDetails();
				VisitState.notifyBillingDataChanged();
			} else {
				await loadBillingLines(String(visitNumeric));
			}
		} catch (err) {
			console.error(err);
			loadError = tr(
				bm('discount_save_failed'),
				'Failed to save discount.'
			);
		}
	}

	async function closeBill() {
		if (!visitId || !canCloseBill) return;
		const visitNumeric = parseUuid(visitId) ?? '';
		if (
			!visitNumeric
		)
			return;
		try {
			const res = await postBillingUpdate({
				action: 'close',
				visitId: visitNumeric
			});
			if (!res.ok) {
				try {
					const j = (await res.json()) as { message?: string };
					const serverMsg = sanitizeUserFacingErrorText(
						typeof j?.message === 'string' ? j.message : undefined,
						{ status: res.status }
					);
					loadError =
						serverMsg ||
						(res.status === 400
							? closeBlockedTooltip()
							: tr(bm('load_failed'), 'Request failed.'));
				} catch {
					loadError =
						res.status === 400
							? closeBlockedTooltip()
							: tr(bm('load_failed'), 'Request failed.');
				}
				return;
			}
			loadError = '';
			await loadBillingLines(String(visitNumeric));
		} catch {
			// silent
		}
	}

	async function printBill(opts: {
		groups: BillingGroup[];
		visitSummary: VisitSummary;
		grandTotal: number;
		discountValue: number;
		netTotal: number;
		hasDiscount: boolean;
		advanceDepositCollected?: number;
		advanceAppliedToBill?: number;
		advanceRefundDue?: number;
		balanceDue?: number;
	}): Promise<void> {
		if (!opts.groups.length || !hospitalId) return;

		const v = opts.visitSummary;
		const bodyHtml = buildOpBillingPrintBodyHtml({
			groups: opts.groups.map((g) => ({
				subCategoryName: g.groupHeading,
				lines: g.lines.map((line) => opBillingLineToPrintLine(line)),
				subtotal: g.subtotal
			})),
			grandTotal: opts.grandTotal,
			discountValue: opts.discountValue,
			netTotal: opts.netTotal,
			hasDiscount: opts.hasDiscount,
			advanceDepositCollected: opts.advanceDepositCollected,
			advanceAppliedToBill: opts.advanceAppliedToBill,
			advanceRefundDue: opts.advanceRefundDue,
			balanceDue: opts.balanceDue,
			labels: {
				service: tr(bm('print_service'), 'Service'),
				order: tr(bm('print_order'), 'Order'),
				qty: tr(bm('col_qty'), 'Qty'),
				unit: tr(bm('col_unit'), 'Unit'),
				unitPrice: tr(bm('col_unit_price'), 'Unit price'),
				amount: tr(bm('print_amount'), 'Amount'),
				subtotal: tr(bm('print_subtotal'), 'Subtotal'),
				grandTotal: tr(
					bm('print_grand_total'),
					'Grand total'
				),
				discount: tr(bm('print_discount'), 'Discount'),
				netTotal: tr(bm('print_net_total'), 'Net total'),
				advanceDeposit: 'Advance deposit (collected)',
				appliedToBill: 'Applied to bill',
				refundDue: 'Refund due',
				balanceDue: 'Balance due'
			},
			formatMoney: formatMoneyAmount
		});

		const printedAt = `${tr(bm('print_generated'), 'Printed')}: ${new Date().toLocaleString()}`;

		await printFromDocumentMaster({
			hospitalId,
			documentCode: printDocumentCode,
			extraPlaceholders: {
				'{{patient.name}}': v?.patientName?.trim() || '—',
				'{{patient.code}}': v?.patientCode?.trim() || '—',
				'{{visit.no}}': v?.visitNo ?? '—',
				'{{visit.date}}': formatPrintDate(v?.visitDateIso),
				'{{doctor.name}}': v?.doctorName?.trim() || '—',
				'{{visit.department}}': v?.branchName?.trim() || '—',
				'{{hospital.name}}':
					v?.hospitalName?.trim() ||
					tr(bm('title'), isIpBilling ? 'IP Billing' : 'OP Billing'),
				'{{print.body_html}}': bodyHtml,
				'{{print.datetime}}': printedAt,
				'{{print.label_patient}}': tr(
					bm('print_patient'),
					'Patient'
				),
				'{{print.label_patient_code}}': tr(
					bm('print_patient_code'),
					'Patient code'
				),
				'{{print.label_visit_no}}': tr(
					bm('print_visit_no'),
					'Visit no.'
				),
				'{{print.label_date}}': tr(bm('print_date'), 'Date'),
				'{{print.label_doctor}}': tr(
					bm('print_doctor'),
					'Doctor'
				),
				'{{print.label_branch}}': tr(
					bm('print_branch'),
					'Branch'
				),
				'{{print.label_thank_you}}': tr(
					bm('print_thank_you'),
					'Thank you for choosing us.'
				)
			},
			iframeId: printIframeId
		});
	}

	function printCurrentBill() {
		if (!visitId) return;
		if (!groups.length) return;
		if (!visitSummary) return;

		void printBill({
			groups,
			visitSummary,
			grandTotal: linesSubtotalDisplay,
			discountValue: discountValueDisplay,
			netTotal,
			hasDiscount: hasDiscountDisplay,
			advanceDepositCollected:
				isIpBilling && advanceCollectedDisplay > 0
					? advanceCollectedDisplay
					: undefined,
			advanceAppliedToBill:
				isIpBilling && advanceCollectedDisplay > 0
					? advanceAppliedDisplay
					: undefined,
			advanceRefundDue:
				isIpBilling && advanceRefundDisplay > 0
					? advanceRefundDisplay
					: undefined,
			balanceDue:
				isIpBilling && advanceCollectedDisplay > 0
					? payableDisplay
					: undefined
		});
	}

	async function loadHistoryBills(
		currentVisitId: string | null
	): Promise<void> {
		if (!currentVisitId) {
			historyBills = [];
			historyError = '';
			return;
		}

		const visitNumeric = parseUuid(currentVisitId) ?? '';
		if (
			!visitNumeric
		) {
			historyBills = [];
			historyError = '';
			return;
		}

		historyLoading = true;
		historyError = '';
		try {
			const res = await fetch(
				`${billApiBase}/bills?visitId=${visitNumeric}`
			);
			if (!res.ok) {
				historyBills = [];
				historyError = tr(undefined, 'Failed to load bill history.');
				return;
			}
			const data = (await res.json()) as {
				items?: BillingHistory[];
			};
			historyBills = Array.isArray(data.items) ? data.items : [];
		} catch (err) {
			console.error(err);
			historyBills = [];
			historyError = tr(undefined, 'Failed to load bill history.');
		} finally {
			historyLoading = false;
		}
	}

	async function printHistoryBill(billingId: number): Promise<void> {
		if (!browser) return;
		if (!billingId || !Number.isFinite(billingId) || billingId <= 0)
			return;

		historyPrintLoadingId = billingId;
		try {
			const res = await fetch(`${billApiBase}/bills`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ billingId })
			});
			if (!res.ok) {
				historyError = tr(
					undefined,
					'Failed to load bill details for printing.'
				);
				return;
			}
			const data = (await res.json()) as {
				bill?: {
					id: number;
					billNo: string | null;
					linesSubtotal: string | number | null;
					discountAmount: string | number | null;
					totalAmount: string | number | null;
					advanceAppliedAmount?: string | number | null;
					amountPaid?: string | number | null;
					createdAt?: string | null;
					printedAt?: string | null;
					visit?: {
						id: number;
						visitNo: string | null;
						createdAt?: string | null;
					} | null;
					hospital?: { name: string | null } | null;
					branch?: { name: string | null } | null;
				} | null;
				lines?: BillingDetailLine[];
			};

			const bill = data.bill ?? null;
			if (!bill) {
				historyError = tr(
					undefined,
					'Failed to load bill details for printing.'
				);
				return;
			}

			const detailLines = Array.isArray(data.lines) ? data.lines : [];
			const printLines: BillingLine[] = detailLines.map((l) => ({
				id: l.id,
				serviceId: l.serviceId,
				serviceName: l.serviceName,
				orderNo: l.orderNo,
				subCategoryId: l.subCategoryId,
				subCategoryName: l.subCategoryName,
				categoryName: l.categoryName ?? null,
				serviceAmount: l.serviceAmount,
				serviceTaxAmount: l.serviceTaxAmount,
				discount: l.discount,
				serviceUnit: l.serviceUnit
			}));
			const printGroups = groupLines(printLines);
			const linesSubtotal = printGroups.reduce(
				(sum, g) => sum + g.subtotal,
				0
			);
			const discountAmt = Number(bill.discountAmount ?? 0) || 0;
			const net = Math.max(
				0,
				linesSubtotal -
					Math.min(linesSubtotal, Math.max(0, discountAmt))
			);
			const hasDisc = discountAmt > 0;
			let advanceCollected = 0;
			let advanceApplied = 0;
			let historyRefundDue = 0;
			let historyBalanceDue: number | undefined;

			const historyVisitUuid =
				bill.visit?.id != null
					? parseUuid(String(bill.visit.id)) ?? ''
					: parseUuid(visitId) ?? '';

			if (isIpBilling && historyVisitUuid) {
				const linesRes = await fetch(
					`${billApiBase}/visit-lines?visitId=${historyVisitUuid}`
				);
				if (linesRes.ok) {
					const linesPayload =
						(await linesRes.json()) as OpBillingVisitLinesGetResponse;
					const totals = resolveVisitBillTotalsFromLinesResponse(
						linesPayload,
						VisitTypeEnum.IPD
					);
					advanceCollected = totals.advanceTotal;
					advanceApplied = totals.advanceCredit;
					historyRefundDue = totals.advanceRefundDue;
					historyBalanceDue = totals.balanceDue;
				}
			}

			if (isIpBilling && advanceCollected <= 0) {
				advanceApplied =
					bill.advanceAppliedAmount != null
						? Number(bill.advanceAppliedAmount) || 0
						: 0;
				historyBalanceDue =
					advanceApplied > 0
						? bill.amountPaid != null
							? Number(bill.amountPaid) || 0
							: Math.max(0, net - advanceApplied)
						: undefined;
			}

			const v: VisitSummary = {
				id: bill.visit?.id ?? (parseUuid(visitId) ?? ''),
				visitNo:
					bill.visit?.visitNo?.trim() ||
					(bill.visit?.id ? String(bill.visit.id) : String(bill.id)),
				hospitalName: bill.hospital?.name?.trim() || null,
				branchName: bill.branch?.name?.trim() || null,
				patientName: visitSummary?.patientName ?? null,
				patientCode: visitSummary?.patientCode ?? null,
				visitDateIso:
					bill.visit?.createdAt ?? visitSummary?.visitDateIso ?? null,
				doctorName: visitSummary?.doctorName ?? null
			};

			historyError = '';
			void printBill({
				groups: printGroups,
				visitSummary: v,
				grandTotal: linesSubtotal,
				discountValue: Math.min(
					linesSubtotal,
					Math.max(0, discountAmt)
				),
				netTotal: net,
				hasDiscount: hasDisc,
				advanceDepositCollected:
					isIpBilling && advanceCollected > 0
						? advanceCollected
						: undefined,
				advanceAppliedToBill:
					isIpBilling && advanceCollected > 0
						? advanceApplied
						: undefined,
				advanceRefundDue:
					isIpBilling && historyRefundDue > 0
						? historyRefundDue
						: undefined,
				balanceDue: historyBalanceDue
			});
		} catch (err) {
			console.error(err);
			historyError = tr(
				undefined,
				'Failed to load bill details for printing.'
			);
		} finally {
			historyPrintLoadingId = null;
		}
	}

	$effect(() => {
		if (!browser || billingViewAll) return;
		void VisitState.billingRefreshRevision;
		void loadBillingLines(visitId);
	});

	function billThisVisitFromAll(id: string) {
		VisitState.visitId = id;
		billingViewAll = false;
	}

	function scopeMsg(key: string, fallback: string): string {
		try {
			const fn = msg[key];
			return typeof fn === 'function' ? fn() : fallback;
		} catch {
			return fallback;
		}
	}

	function allVisitsPrintLabels(): BillingPrintLabels {
		return {
			service: tr(bm('print_service'), 'Service'),
			order: tr(bm('print_order'), 'Order'),
			qty: tr(bm('col_qty'), 'Qty'),
			unit: tr(bm('col_unit'), 'Unit'),
			unitPrice: tr(bm('col_unit_price'), 'Unit price'),
			amount: tr(bm('print_amount'), 'Amount'),
			subtotal: tr(bm('print_subtotal'), 'Subtotal'),
			grandTotal: tr(bm('print_grand_total'), 'Grand total'),
			discount: tr(bm('print_discount'), 'Discount'),
			netTotal: tr(bm('print_net_total'), 'Net total'),
			allVisitsTotal:
				scopeMsg('billing_scope_print_all_combined', 'All visits total'),
			patient: tr(bm('print_patient'), 'Patient'),
			patientCode: tr(bm('print_patient_code'), 'Patient code'),
			visitNo: tr(bm('print_visit_no'), 'Visit no.'),
			date: tr(bm('print_date'), 'Date'),
			doctor: tr(bm('print_doctor'), 'Doctor'),
			branch: tr(bm('print_branch'), 'Branch'),
			generated: tr(bm('print_generated'), 'Printed'),
			thankYou: tr(bm('print_thank_you'), 'Thank you for choosing us.'),
			opTitle: tr(bm('title'), 'OP Billing'),
			ipTitle: 'IP Billing',
			advanceDeposit: 'Advance deposit (collected)',
			appliedToBill: 'Applied to bill',
			refundDue: 'Refund due',
			balanceDue: 'Balance due'
		};
	}

	async function printAllVisitsInCard() {
		if (!hospitalId || !openBillDetails.length) return;
		await printAllOpenBillsCombined({
			hospitalId,
			details: openBillDetails,
			labels: allVisitsPrintLabels()
		});
	}

	function syncGrandTotalFromDetails() {
		openBillsGrandTotal = sumPayableOpenBillDetails(openBillDetails);
	}

	async function reloadOpenBillDetails() {
		if (!hospitalId || openBillDetails.length === 0) return;
		const rows = openBillDetails.map((d) => d.row);
		openBillDetails = await fetchAllOpenBillVisitDetails({
			hospitalId,
			rows,
			otherGroupLabel: tr(bm('group_other'), 'Other')
		});
		syncGrandTotalFromDetails();
	}

	const canCloseAllBills = $derived(
		canCloseAllOpenBillDetails(openBillDetails) &&
			openBillDetails.length > 0
	);

	function setDiscountFieldsFromMeta(b: BillingMeta | null | undefined) {
		if (!b?.discountTypeId || b.discountTypeId === BillingDiscountTypeEnum.NONE) {
			discountType = BillingDiscountTypeEnum.NONE;
			discountInput = '';
		} else if (b.discountTypeId === BillingDiscountTypeEnum.PERCENT) {
			discountType = BillingDiscountTypeEnum.PERCENT;
			const pct = Number(b.discountPercent ?? 0);
			discountInput =
				Number.isFinite(pct) && pct > 0 ? String(pct) : '';
		} else if (b.discountTypeId === BillingDiscountTypeEnum.FIXED_AMOUNT) {
			discountType = BillingDiscountTypeEnum.FIXED_AMOUNT;
			const amt = Number(b.discountAmount ?? 0);
			discountInput =
				Number.isFinite(amt) && amt > 0 ? String(amt) : '';
		}
	}

	function openDiscountForVisit(targetId: string) {
		const detail = openBillDetails.find((d) => d.row.visitId === targetId);
		if (!detail?.data.billing) return;
		discountTargetVisitId = targetId;
		setDiscountFieldsFromMeta(detail.data.billing);
		isDiscountModalOpen = true;
	}

	function openSingleVisitDiscount() {
		discountTargetVisitId = null;
		setDiscountFieldsFromMeta(billingMeta);
		isDiscountModalOpen = true;
	}

	async function onCloseAllBillsConfirmed() {
		closeAllConfirmOpen = false;
		if (!hospitalId || !openBillDetails.length || !canCloseAllBills) return;
		closeAllWorking = true;
		loadError = '';
		try {
			const result = await closeAllOpenBills({
				hospitalId,
				rows: openBillDetails.map((d) => d.row)
			});
			if (result.closed.length > 0) {
				VisitState.notifyBillingDataChanged();
				await reloadOpenBillDetails();
				if (openBillDetails.length === 0) {
					billingViewAll = false;
				}
			}
			if (result.failed.length > 0) {
				const f = result.failed[0]!;
				const label = f.visitNo ?? f.visitId.slice(0, 8);
				loadError = `${label}: ${f.message}`;
			}
		} finally {
			closeAllWorking = false;
		}
	}

	$effect(() => {
		if (!billingMeta && isDiscountModalOpen && !billingViewAll) {
			isDiscountModalOpen = false;
		}
	});
</script>

{#snippet billingBillMarkup()}
{#if visitId && !billingViewAll}
	<div class="mb-2 flex flex-wrap items-center justify-end gap-2">
		<WashTooltip tooltipText={tr(undefined, 'History')} className="">
			<WashButton
				className="btn-outline btn-sm"
				onClick={() => {
					isHistoryModalOpen = true;
					void loadHistoryBills(visitId);
				}}
			>
				{tr(undefined, 'History')}
			</WashButton>
		</WashTooltip>
	</div>
{/if}

<WashCard>
	<WashCardBody className="gap-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<WashCardBodyTitle
				>{billingViewAll
					? scopeMsg('billing_scope_view_all', 'All open visits')
					: tr(bm('title'), 'Billing')}</WashCardBodyTitle
			>
			{#if visitId && billingViewAll}
				<div class="flex flex-wrap items-center gap-2">
					<WashTooltip
						tooltipText={scopeMsg(
							'billing_scope_print_all',
							'Print all visits'
						)}
						className=""
					>
						<WashButton
							className="btn-outline btn-sm gap-2"
							disabled={openBillDetailsLoading ||
								openBillDetails.length === 0}
							onClick={() => void printAllVisitsInCard()}
						>
							<LucidePrinter className="size-4" />
							{scopeMsg(
								'billing_scope_print_all',
								'Print all visits'
							)}
						</WashButton>
					</WashTooltip>
					<WashTooltip
						tooltipText={canCloseAllBills
							? scopeMsg(
									'billing_scope_close_all',
									'Close all bills'
								)
							: scopeMsg(
									'billing_scope_close_all_not_ready',
									'One or more visits are not ready to close.'
								)}
						className=""
					>
						<WashButton
							className="btn-outline btn-sm"
							disabled={openBillDetailsLoading ||
								closeAllWorking ||
								!canCloseAllBills}
							onClick={() => {
								closeAllConfirmOpen = true;
							}}
						>
							{scopeMsg(
								'billing_scope_close_all',
								'Close all bills'
							)}
						</WashButton>
					</WashTooltip>
				</div>
			{:else if visitId}
				<div class="flex flex-wrap items-center gap-2">
					<WashTooltip
						tooltipText={canCloseBill
							? tr(bm('bill_close'), 'Bill close')
							: closeBlockedTooltip()}
						className=""
					>
						<WashButton
							className="btn-outline btn-sm"
							disabled={isLoading ||
								!!loadError ||
								!billingMeta ||
								!canCloseBill}
							onClick={() => void closeBill()}
						>
							{tr(bm('bill_close'), 'Bill close')}
						</WashButton>
					</WashTooltip>

					<WashTooltip
						tooltipText={tr(bm('print_bill'), 'Print bill')}
						className=""
					>
						<WashButton
							className="btn-outline btn-sm gap-2"
							disabled={isLoading ||
								!!loadError ||
								groups.length === 0}
							onClick={() => printCurrentBill()}
						>
							<LucidePrinter className="size-4" />
							{tr(bm('print_bill'), 'Print bill')}
						</WashButton>
					</WashTooltip>
				</div>
			{/if}
		</div>
		{#if !visitId}
			<p class="text-sm text-base-content/70">
				{tr(bm('select_visit_hint'), 'Select a visit to bill.')}
			</p>
		{:else if billingViewAll}
			{#if loadError}
				<p class="text-sm text-error">{loadError}</p>
			{/if}
			{#if openBillDetailsLoading}
				<p class="text-sm text-base-content/60">Loading all visits…</p>
			{:else if openBillDetails.length === 0}
				<p class="text-sm text-base-content/60">
					{scopeMsg(
						'billing_scope_select_visit',
						'Select a visit to see open bills.'
					)}
				</p>
			{:else}
				<LBillingAllVisitsPanel
					embedded
					{hospitalId}
					details={openBillDetails}
					currentVisitId={visitId ?? ''}
					onSelectVisit={billThisVisitFromAll}
					onOpenDiscount={openDiscountForVisit}
				/>
			{/if}
		{:else}
			<OpBillingReadinessPanel
				readiness={billingReadiness}
				{hospitalId}
				visitId={visitId ?? ''}
				draftSubtotal={grandTotal}
				isClosed={visitLevelDiscountLocked}
			/>
			<div class="mt-2 space-y-3">
				{#if loadError}
					<p class="text-sm text-error">{loadError}</p>
				{:else if isLoading}
					<p class="text-sm text-base-content/60">
						{tr(
							bm('loading_lines'),
							'Loading billing lines…'
						)}
					</p>
				{:else if groups.length === 0}
					<p class="text-sm text-base-content/60">
						{tr(
							bm('no_services_found'),
							'No billable services found for this visit.'
						)}
					</p>
				{:else}
					<div
						class="flex items-center justify-between gap-3 text-sm font-semibold"
					>
						<span>{tr(bm('total_bill'), 'Total bill')}</span>
						<div class="flex items-center gap-2">
							<div class="text-right">
								{#if hasDiscountDisplay}
									<div
										class="text-xs font-medium text-base-content/60 line-through"
									>
										{formatMoneyAmount(linesSubtotalDisplay)}
									</div>
									<div
										class="font-mono text-base-content tabular-nums"
									>
										{formatMoneyAmount(netTotal)}
									</div>
								{:else}
									<div class="font-mono tabular-nums">
										{formatMoneyAmount(linesSubtotalDisplay)}
									</div>
								{/if}
							</div>

							<WashTooltip
								tooltipText={tr(
									bm('discount_open'),
									'Discount'
								)}
								className=""
							>
								<WashButton
									className="btn-primary btn-sm btn-circle"
									disabled={!billingMeta}
									onClick={() => {
										if (billingMeta) openSingleVisitDiscount();
									}}
								>
									<LucideStrikeThrough className="size-4" />
								</WashButton>
							</WashTooltip>
						</div>
					</div>

					{#if isIpBilling && advanceCollectedDisplay > 0}
						<div
							class="flex items-center justify-between gap-3 text-sm"
						>
							<span class="text-base-content/70"
								>Advance deposit (collected)</span
							>
							<span class="font-mono tabular-nums"
								>{formatMoneyAmount(
									advanceCollectedDisplay
								)}</span
							>
						</div>
						<div
							class="flex items-center justify-between gap-3 text-sm"
						>
							<span class="text-base-content/70"
								>Applied to bill</span
							>
							<span class="font-mono tabular-nums"
								>− {formatMoneyAmount(
									advanceAppliedDisplay
								)}</span
							>
						</div>
						{#if advanceRefundDisplay > 0}
							<div
								class="flex items-center justify-between gap-3 text-sm font-semibold text-success"
							>
								<span>Refund due</span>
								<span class="font-mono tabular-nums"
									>{formatMoneyAmount(
										advanceRefundDisplay
									)}</span
								>
							</div>
						{/if}
						<div
							class="flex items-center justify-between gap-3 text-sm font-semibold"
						>
							<span>Balance due</span>
							<span class="font-mono tabular-nums"
								>{formatMoneyAmount(payableDisplay)}</span
							>
						</div>
					{/if}

					{#if billingMeta?.discountedByStaff || billingMeta?.printedByStaff}
						<div
							class="mt-1 space-y-0.5 text-xs text-base-content/60"
						>
							{#if billingMeta?.discountedByStaff}
								<div>
									{tr(bm('discounted_by'), 'Discounted by')}
									{staffDisplayName(billingMeta.discountedByStaff) ||
										'—'}
								</div>
							{/if}
							{#if billingMeta?.printedByStaff}
								<div>
									{tr(bm('printed_by'), 'Printed by')}
									{staffDisplayName(billingMeta.printedByStaff) ||
										'—'}
								</div>
							{/if}
						</div>
					{/if}

					<div
						class="rounded-box divide-y divide-base-300 border border-base-300"
					>
						{#each groups as group (group.subCategoryId ?? group.subCategoryName)}
							<div class="collapse-arrow collapse bg-base-100">
								<input type="checkbox" checked />
								<div
									class="collapse-title flex items-center justify-between gap-4 text-sm font-medium"
								>
									<span class="truncate">{group.groupHeading}</span
									>
									<span
										class="font-mono text-base-content/80 tabular-nums"
									>
										{formatMoneyAmount(group.subtotal)}
									</span>
								</div>
								<div class="collapse-content">
									<BillingBillLineRows
										lines={group.lines}
										lineKey={opBillingLineRowKey}
										serviceFallback={tr(
											bm('service_fallback'),
											'Service'
										)}
										orderPrefix={tr(
											bm('order_prefix'),
											'Order'
										)}
										colService={tr(
											bm('print_service'),
											'Service'
										)}
										colQty={tr(bm('col_qty'), 'Qty')}
										colUnit={tr(bm('col_unit'), 'Unit')}
										colUnitPrice={tr(
											bm('col_unit_price'),
											'Unit price'
										)}
										colAmount={tr(
											bm('print_amount'),
											'Amount'
										)}
									/>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</WashCardBody>
</WashCard>

{#if isDiscountModalOpen}
	<WashDialog
		id={`${billingUiKey}-discount-modal`}
		open={true}
		onClose={() => {
			isDiscountModalOpen = false;
			discountTargetVisitId = null;
		}}
		title={trForDiscountModal('discount_title', 'Discount')}
		description={discountTargetDetail
			? `${trForDiscountModal('discount_subtitle', 'Apply a discount to the grand total.')} · ${discountTargetDetail.row.visitNo ?? discountTargetDetail.data.visit?.visitNo ?? discountTargetVisitId?.slice(0, 8) ?? ''}`
			: trForDiscountModal(
					'discount_subtitle',
					'Apply a discount to the grand total.'
				)}
		boxClassName="max-w-md"
		showActions={false}
	>
		<div class="min-h-0 flex-1 overflow-y-auto">
			<div class="space-y-3">
				<div class="form-control w-full">
					<label for="a11y-page-c9753b" class="label">
						<span class="label-text">
							{trForDiscountModal(
								'discount_type_label',
								'Discount type'
							)}
						</span>
					</label>
					<WashSelect
						id="a11y-page-c9753b"
						className="w-full"
						value={String(discountType)}
						options={[
							{
								value: String(BillingDiscountTypeEnum.NONE),
								label: trForDiscountModal(
									'discount_type_none',
									'None'
								)
							},
							{
								value: String(BillingDiscountTypeEnum.PERCENT),
								label: trForDiscountModal(
									'discount_type_percent',
									'Percent (%)'
								)
							},
							{
								value: String(BillingDiscountTypeEnum.FIXED_AMOUNT),
								label: trForDiscountModal(
									'discount_type_fixed_amount',
									'Fixed amount'
								)
							}
						]}
						onChange={(next) => {
							const v = Number(next);
							discountType = (
								Number.isFinite(v) ? v : BillingDiscountTypeEnum.NONE
							) as BillingDiscountTypeEnum;
						}}
					/>
				</div>

				<label class="form-control w-full">
					<div class="label">
						<span class="label-text">
							{tr(bm('discount_amount_label'), 'Amount')}
						</span>
						<span class="label-text-alt text-base-content/60">
							{#if discountType === BillingDiscountTypeEnum.PERCENT}
								{tr(
									bm('discount_amount_hint_percent'),
									'0–100'
								)}
							{:else if discountType === BillingDiscountTypeEnum.FIXED_AMOUNT}
								{tr(
									bm('discount_amount_hint_amount'),
									'Cannot exceed total'
								)}
							{:else}
								{tr(bm('discount_amount_hint_none'), '—')}
							{/if}
						</span>
					</div>
					<input
						class="input-bordered input w-full"
						type="number"
						inputmode="decimal"
						min="0"
						step="0.01"
						placeholder={tr(
							bm('discount_amount_placeholder'),
							'0'
						)}
						disabled={discountType === BillingDiscountTypeEnum.NONE}
						bind:value={discountInput}
					/>
				</label>

				<div class="rounded-box bg-base-200/40 p-3 text-sm">
					<div class="flex items-center justify-between gap-3">
						<span class="text-base-content/70">
							{tr(bm('discount_preview_label'), 'Preview')}
						</span>
						<span class="font-mono tabular-nums">
							-{formatMoneyAmount(discountPreviewValue)}
						</span>
					</div>
					<div
						class="mt-1 flex items-center justify-between gap-3 font-semibold"
					>
						<span
							>{tr(
								bm('discount_net_total_label'),
								'Net total'
							)}</span
						>
						<span class="font-mono tabular-nums">
							{formatMoneyAmount(discountPreviewNetTotal)}
						</span>
					</div>
				</div>
			</div>
		</div>

		<WashDialogFooter className="gap-2">
			<WashButton
				className="btn-ghost"
				onClick={() => {
					discountType = BillingDiscountTypeEnum.NONE;
					discountInput = '';
				}}
			>
				{tr(bm('discount_clear'), 'Clear')}
			</WashButton>
			<WashButton
				className="btn-primary"
				disabled={discountModalLocked}
				onClick={() => void applyDiscount()}
			>
				{trForDiscountModal('discount_apply', 'Apply')}
			</WashButton>
		</WashDialogFooter>
	</WashDialog>
{/if}

{#if isHistoryModalOpen}
	<WashDialog
		id={`${billingUiKey}-history-modal`}
		open={true}
		onClose={() => (isHistoryModalOpen = false)}
		title={tr(undefined, 'Bill history')}
		description={tr(
			undefined,
			'Print any previous OP bill for this visit.'
		)}
		boxClassName="max-w-5xl"
		showActions={false}
	>
		<div class="min-h-0 flex-1 overflow-y-auto">
			<div class="flex items-start justify-end gap-4">
				<WashButton
					className="btn-outline btn-sm"
					disabled={historyLoading}
					onClick={() => void loadHistoryBills(visitId)}
				>
					{tr(undefined, 'Refresh')}
				</WashButton>
			</div>

			{#if historyError}
				<p class="mt-3 text-sm text-error">{historyError}</p>
			{/if}

			<div class="mt-4 overflow-x-auto">
				<table class="table-zebra table w-full text-sm">
					<thead>
						<tr>
							<th>{tr(undefined, 'Bill')}</th>
							<th>{tr(undefined, 'Created')}</th>
							<th>{tr(undefined, 'Printed')}</th>
							<th class="text-right">{tr(undefined, 'Subtotal')}</th>
							<th class="text-right">{tr(undefined, 'Discount')}</th>
							<th class="text-right">{tr(undefined, 'Total')}</th>
							<th>{tr(undefined, 'Status')}</th>
							<th class="text-right">{tr(undefined, 'Actions')}</th>
						</tr>
					</thead>
					<tbody>
						{#if historyLoading}
							<tr>
								<td
									colspan="8"
									class="py-6 text-center text-base-content/60"
								>
									{tr(undefined, 'Loading history…')}
								</td>
							</tr>
						{:else if historyBills.length === 0}
							<tr>
								<td
									colspan="8"
									class="py-6 text-center text-base-content/60"
								>
									{tr(undefined, 'No bills found for this visit.')}
								</td>
							</tr>
						{:else}
							{#each historyBills as b (b.id)}
								<tr>
									<td class="font-medium whitespace-nowrap">
										{b.billNo?.trim() || `#${b.id}`}
									</td>
									<td class="whitespace-nowrap">
										{formatPrintDate(b.createdAt)}
									</td>
									<td class="whitespace-nowrap">
										{formatPrintDate(
											b.printedAt ??
												(b.statusTaggingId ===
												BillingStatusTaggingEnum.CLOSED
													? b.updatedAt
													: null)
										)}
									</td>
									<td
										class="text-right font-mono whitespace-nowrap tabular-nums"
									>
										{formatMoneyAmount(
											Number(b.linesSubtotal ?? 0) || 0
										)}
									</td>
									<td
										class="text-right font-mono whitespace-nowrap tabular-nums"
									>
										{formatMoneyAmount(
											Number(b.discountAmount ?? 0) || 0
										)}
									</td>
									<td
										class="text-right font-mono whitespace-nowrap tabular-nums"
									>
										{formatMoneyAmount(
											Number(b.totalAmount ?? 0) || 0
										)}
									</td>
									<td class="whitespace-nowrap">
										{#if b.statusTaggingId ===
											BillingStatusTaggingEnum.CLOSED}
											<span class="badge badge-neutral">
												{tr(undefined, 'Closed')}
											</span>
										{:else}
											<span class="badge badge-primary">
												{tr(undefined, 'Open')}
											</span>
										{/if}
									</td>
									<td class="text-right whitespace-nowrap">
										<WashButton
											className="btn-outline btn-sm gap-2"
											disabled={historyPrintLoadingId === b.id}
											onClick={() => void printHistoryBill(b.id)}
										>
											<LucidePrinter className="size-4" />
											{tr(undefined, 'Print')}
										</WashButton>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<WashDialogFooter>
			<WashButton
				className="btn-primary"
				onClick={() => (isHistoryModalOpen = false)}
			>
				{tr(undefined, 'Close')}
			</WashButton>
		</WashDialogFooter>
	</WashDialog>
{/if}

{#if closeAllConfirmOpen}
	<WashDialog
		open={true}
		title={scopeMsg('billing_scope_close_all', 'Close all bills')}
		onClose={() => {
			closeAllConfirmOpen = false;
		}}
		showActions={false}
	>
		<p class="text-sm">
			{scopeMsg(
				'billing_scope_close_all_confirm',
				'Close every open bill for this patient?'
			)}
		</p>
		<WashDialogFooter>
			<WashButton
				className="btn-ghost"
				onClick={() => {
					closeAllConfirmOpen = false;
				}}
			>
				Cancel
			</WashButton>
			<WashButton
				className="btn-primary"
				disabled={closeAllWorking || !canCloseAllBills}
				onClick={() => void onCloseAllBillsConfirmed()}
			>
				{scopeMsg('billing_scope_close_all', 'Close all bills')}
			</WashButton>
		</WashDialogFooter>
	</WashDialog>
{/if}
{/snippet}

{#if isIpBilling && !billingViewAll}
	<LIpdVisitRequiredAlert
		{hospitalId}
		visitId={visitId ?? ''}
		message="IP Billing is for IPD visits only. The selected visit is not IPD — choose an IPD visit to continue."
	>
		{@render billingBillMarkup()}
	</LIpdVisitRequiredAlert>
{:else}
	{@render billingBillMarkup()}
{/if}
