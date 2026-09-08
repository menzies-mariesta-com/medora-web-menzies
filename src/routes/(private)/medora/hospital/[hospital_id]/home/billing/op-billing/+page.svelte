<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashModal from '$lib/component/wash/modal/WashModal.svelte';
	import WashModalBox from '$lib/component/wash/modal/box/WashModalBox.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import LucideStrikeThrough from '$lib/component/own/library/lucide/LucideStrikeThrough.svelte';
	import OpBillingReadinessPanel from '$lib/component/own/local/private/medora/billing/OpBillingReadinessPanel.svelte';
	import { m } from '$lib/paraglide/messages';
	import { BillingDiscountTypeEnum } from '$lib/model/enum/billing-discount-type.enum';
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
	import { buildOpBillingPrintBodyHtml } from '$lib/util/op-billing-print-table.util';
	import { formatMoneyAmount } from '$lib/util/number-display.util';
	import { VisitState } from '$lib/state/visit.state.svelte';

	const msg = m as Record<
		string,
		(inputs?: Record<string, unknown>) => string
	>;

	const visitId = $derived(VisitState.visitId);
	const hospitalId = $derived(page.params.hospital_id ?? '');

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
		subCategoryName: string;
		lines: BillingLine[];
		subtotal: number;
	};

	type VisitSummary = OpBillingVisitSummary;

	type StaffSummary = OpBillingStaffSummary;

	type BillingMeta = OpBillingMeta;

	type OpBillingHistory = {
		id: number;
		billNo: string | null;
		createdAt: string;
		printedAt: string | null;
		linesSubtotal: string | number | null;
		discountAmount: string | number | null;
		totalAmount: string | number | null;
		discountedByStaff?: StaffSummary | null;
		printedByStaff?: StaffSummary | null;
	};

	type OpBillingDetailLine = {
		id: number;
		serviceId: number;
		serviceName: string | null;
		orderNo: string | null;
		subCategoryId: number | null;
		subCategoryName: string | null;
		serviceAmount: string | number | null;
		serviceTaxAmount: string | number | null;
		discount: string | number | null;
		serviceUnit: number | null;
		lineTotal: string | number | null;
	};

	let isLoading = $state(false);
	let loadError = $state('');
	let groups = $state<BillingGroup[]>([]);
	let grandTotal = $state(0);
	let visitSummary = $state<VisitSummary | null>(null);
	let billingMeta = $state<BillingMeta | null>(null);
	let billingReadiness = $state<OpBillingReadiness | null>(null);

	let isDiscountModalOpen = $state(false);
	let discountType = $state<BillingDiscountTypeEnum>(
		BillingDiscountTypeEnum.NONE
	);
	let discountInput = $state('');

	let isHistoryModalOpen = $state(false);
	let historyLoading = $state(false);
	let historyError = $state('');
	let historyBills = $state<OpBillingHistory[]>([]);
	let historyPrintLoadingId = $state<number | null>(null);

	const discountInputNumber = $derived.by(() => {
		const raw = Number(discountInput);
		return Number.isFinite(raw) ? raw : 0;
	});

	const discountValue = $derived.by(() => {
		const total = Number(grandTotal) || 0;
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
	});

	const netTotal = $derived.by(() => {
		const total = Number(grandTotal) || 0;
		return Math.max(0, total - discountValue);
	});

	const hasDiscount = $derived(discountValue > 0);

	/** Bill was closed; discount is frozen for that bill. */
	const visitLevelDiscountLocked = $derived.by(() => {
		const p = billingMeta?.printedAt;
		return p != null && String(p).trim() !== '';
	});

	const canCloseOpBill = $derived(
		Boolean(billingReadiness?.canCloseBill) && !visitLevelDiscountLocked
	);

	function closeBlockedTooltip(): string {
		if (visitLevelDiscountLocked) {
			return m.op_billing_bill_already_closed_tooltip();
		}
		const key = billingReadiness?.blockReasonKey ?? null;
		switch (key) {
			case 'nursing_incomplete':
				return m.op_billing_bill_close_blocked_nursing();
			case 'no_billable_lines':
				return msg.op_billing_bill_close_blocked_no_lines();
			default:
				return msg.op_billing_readiness_not_ready();
		}
	}

	function opBillingLineRowKey(line: BillingLine): string {
		if (
			line.lineSource === 'medication_order_line' ||
			line.lineSource === 'service_order_detail'
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
			const other = tr(msg.op_billing_group_other, 'Other');
			const name = (line.subCategoryName ?? other).trim() || other;
			let group = byKey[key];
			if (!group) {
				group = {
					subCategoryId: line.subCategoryId,
					subCategoryName: name,
					lines: [],
					subtotal: 0
				};
				byKey[key] = group;
			}
			group.lines.push(line);
			group.subtotal += lineTotal(line);
		}

		return Object.values(byKey).sort((a, b) =>
			a.subCategoryName.localeCompare(b.subCategoryName)
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

	async function postOpBillingUpdate(
		payload: Record<string, unknown>
	) {
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/billing/op-billing/visit-lines`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			}
		);
		return res;
	}

	async function loadBillingLines(currentVisitId: string | null) {
		if (!currentVisitId) {
			groups = [];
			grandTotal = 0;
			visitSummary = null;
			billingMeta = null;
			billingReadiness = null;
			loadError = '';
			return;
		}

		const visitNumeric = Number(currentVisitId);
		if (
			!visitNumeric ||
			!Number.isFinite(visitNumeric) ||
			visitNumeric <= 0
		) {
			groups = [];
			grandTotal = 0;
			visitSummary = null;
			billingMeta = null;
			billingReadiness = null;
			loadError = '';
			return;
		}

		isLoading = true;
		loadError = '';
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/billing/op-billing/visit-lines?visitId=${visitNumeric}`
			);
			if (!res.ok) {
				groups = [];
				grandTotal = 0;
				visitSummary = null;
				billingMeta = null;
				billingReadiness = null;
				loadError = tr(
					msg.op_billing_load_failed,
					'Failed to load billing lines.'
				);
				return;
			}
			const data = (await res.json()) as OpBillingVisitLinesGetResponse;
			const lines = (data.items ?? []).map((row) => ({
				...row
			}));
			visitSummary = data.visit ?? null;
			billingMeta = data.billing ?? null;
			billingReadiness = data.readiness ?? null;
			const grouped = groupLines(lines);
			groups = grouped;
			grandTotal = grouped.reduce((sum, g) => sum + g.subtotal, 0);

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
			console.error(err);
			groups = [];
			grandTotal = 0;
			visitSummary = null;
			billingMeta = null;
			billingReadiness = null;
			loadError = tr(
				msg.op_billing_load_failed,
				'Failed to load billing lines.'
			);
		} finally {
			isLoading = false;
		}
	}

	async function applyDiscount() {
		if (!visitId) return;
		if (!billingMeta) return;
		if (visitLevelDiscountLocked) return;
		const visitNumeric = Number(visitId);
		if (
			!visitNumeric ||
			!Number.isFinite(visitNumeric) ||
			visitNumeric <= 0
		)
			return;

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
			const res = await postOpBillingUpdate(payload);
			if (!res.ok) {
				if (res.status === 403) {
					try {
						const j = (await res.json()) as { message?: string };
						loadError =
							(typeof j?.message === 'string' && j.message.trim()) ||
							tr(
								msg.op_billing_discount_locked_after_print,
								'This bill was printed; the visit-level discount cannot be changed.'
							);
					} catch {
						loadError = tr(
							msg.op_billing_discount_locked_after_print,
							'This bill was printed; the visit-level discount cannot be changed.'
						);
					}
				} else {
					loadError = tr(
						msg.op_billing_discount_save_failed,
						'Failed to save discount.'
					);
				}
				return;
			}
			isDiscountModalOpen = false;
			await loadBillingLines(String(visitNumeric));
		} catch (err) {
			console.error(err);
			loadError = tr(
				msg.op_billing_discount_save_failed,
				'Failed to save discount.'
			);
		}
	}

	async function closeOpBill() {
		if (!visitId || !canCloseOpBill) return;
		const visitNumeric = Number(visitId);
		if (
			!visitNumeric ||
			!Number.isFinite(visitNumeric) ||
			visitNumeric <= 0
		)
			return;
		try {
			const res = await postOpBillingUpdate({
				action: 'close',
				visitId: visitNumeric
			});
			if (!res.ok) {
				try {
					const j = (await res.json()) as { message?: string };
					const serverMsg =
						typeof j?.message === 'string' ? j.message.trim() : '';
					loadError =
						serverMsg ||
						(res.status === 400
							? closeBlockedTooltip()
							: tr(msg.op_billing_load_failed, 'Request failed.'));
				} catch {
					loadError =
						res.status === 400
							? closeBlockedTooltip()
							: tr(msg.op_billing_load_failed, 'Request failed.');
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
	}): Promise<void> {
		if (!opts.groups.length || !hospitalId) return;

		const v = opts.visitSummary;
		const bodyHtml = buildOpBillingPrintBodyHtml({
			groups: opts.groups.map((g) => ({
				subCategoryName: g.subCategoryName,
				lines: g.lines.map((line) => ({
					serviceName: line.serviceName,
					orderNo: line.orderNo,
					lineTotal: lineTotal(line)
				})),
				subtotal: g.subtotal
			})),
			grandTotal: opts.grandTotal,
			discountValue: opts.discountValue,
			netTotal: opts.netTotal,
			hasDiscount: opts.hasDiscount,
			labels: {
				service: tr(msg.op_billing_print_service, 'Service'),
				order: tr(msg.op_billing_print_order, 'Order'),
				amount: tr(msg.op_billing_print_amount, 'Amount'),
				subtotal: tr(msg.op_billing_print_subtotal, 'Subtotal'),
				grandTotal: tr(msg.op_billing_print_grand_total, 'Grand total'),
				discount: tr(msg.op_billing_print_discount, 'Discount'),
				netTotal: tr(msg.op_billing_print_net_total, 'Net total')
			},
			formatMoney: formatMoneyAmount
		});

		const printedAt = `${tr(msg.op_billing_print_generated, 'Printed')}: ${new Date().toLocaleString()}`;

		await printFromDocumentMaster({
			hospitalId,
			documentCode: DOCUMENT_PRINT_CODE.OP_BILL,
			extraPlaceholders: {
				'{{patient.name}}': v?.patientName?.trim() || '—',
				'{{patient.code}}': v?.patientCode?.trim() || '—',
				'{{visit.no}}': v?.visitNo ?? '—',
				'{{visit.date}}': formatPrintDate(v?.visitDateIso),
				'{{doctor.name}}': v?.doctorName?.trim() || '—',
				'{{visit.department}}': v?.branchName?.trim() || '—',
				'{{hospital.name}}':
					v?.hospitalName?.trim() ||
					tr(msg.op_billing_title, 'OP Billing'),
				'{{print.body_html}}': bodyHtml,
				'{{print.datetime}}': printedAt,
				'{{print.label_patient}}': tr(
					msg.op_billing_print_patient,
					'Patient'
				),
				'{{print.label_patient_code}}': tr(
					msg.op_billing_print_patient_code,
					'Patient code'
				),
				'{{print.label_visit_no}}': tr(
					msg.op_billing_print_visit_no,
					'Visit no.'
				),
				'{{print.label_date}}': tr(msg.op_billing_print_date, 'Date'),
				'{{print.label_doctor}}': tr(
					msg.op_billing_print_doctor,
					'Doctor'
				),
				'{{print.label_branch}}': tr(
					msg.op_billing_print_branch,
					'Branch'
				),
				'{{print.label_thank_you}}': tr(
					msg.op_billing_print_thank_you,
					'Thank you for choosing us.'
				)
			},
			iframeId: 'op-billing-print-iframe'
		});
	}

	function printOpBill() {
		if (!visitId) return;
		if (!groups.length) return;
		if (!visitSummary) return;

		void printBill({
			groups,
			visitSummary,
			grandTotal,
			discountValue,
			netTotal,
			hasDiscount
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

		const visitNumeric = Number(currentVisitId);
		if (
			!visitNumeric ||
			!Number.isFinite(visitNumeric) ||
			visitNumeric <= 0
		) {
			historyBills = [];
			historyError = '';
			return;
		}

		historyLoading = true;
		historyError = '';
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/billing/op-billing/bills?visitId=${visitNumeric}`
			);
			if (!res.ok) {
				historyBills = [];
				historyError = tr(undefined, 'Failed to load bill history.');
				return;
			}
			const data = (await res.json()) as {
				items?: OpBillingHistory[];
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
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/billing/op-billing/bills`,
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ billingId })
				}
			);
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
				lines?: OpBillingDetailLine[];
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

			const v: VisitSummary = {
				id: bill.visit?.id ?? (Number(visitId ?? 0) || 0),
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
				hasDiscount: hasDisc
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
		if (!browser) return;
		void loadBillingLines(visitId);
	});

	$effect(() => {
		if (!billingMeta && isDiscountModalOpen) {
			isDiscountModalOpen = false;
		}
	});
</script>

{#if visitId}
	<div class="mb-2 flex flex-wrap items-center justify-end gap-2">
		<WashTooltip
			tooltipText={tr(undefined, 'History')}
			className=""
		>
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
				>{msg.op_billing_title()}</WashCardBodyTitle
			>
			{#if visitId}
				<div class="flex flex-wrap items-center gap-2">
					<WashTooltip
						tooltipText={canCloseOpBill
							? tr(msg.op_billing_bill_close, 'Bill close')
							: closeBlockedTooltip()}
						className=""
					>
						<WashButton
							className="btn-outline btn-sm"
							disabled={isLoading ||
								!!loadError ||
								!billingMeta ||
								!canCloseOpBill}
							onClick={() => void closeOpBill()}
						>
							{tr(msg.op_billing_bill_close, 'Bill close')}
						</WashButton>
					</WashTooltip>

					<WashTooltip
						tooltipText={msg.op_billing_print_bill()}
						className=""
					>
						<WashButton
							className="btn-outline btn-sm gap-2"
							disabled={isLoading ||
								!!loadError ||
								groups.length === 0}
							onClick={() => printOpBill()}
						>
							<LucidePrinter className="size-4" />
							{msg.op_billing_print_bill()}
						</WashButton>
					</WashTooltip>
				</div>
			{/if}
		</div>
		{#if !visitId}
			<p class="text-sm text-base-content/70">
				{msg.op_billing_select_visit_hint()}
			</p>
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
							msg.op_billing_loading_lines,
							'Loading billing lines…'
						)}
					</p>
				{:else if groups.length === 0}
					<p class="text-sm text-base-content/60">
						{tr(
							msg.op_billing_no_services_found,
							'No billable services found for this visit.'
						)}
					</p>
				{:else}
					<div
						class="flex items-center justify-between gap-3 text-sm font-semibold"
					>
						<span>{tr(msg.op_billing_total_bill, 'Total bill')}</span>
						<div class="flex items-center gap-2">
							<div class="text-right">
								{#if hasDiscount}
									<div
										class="text-xs font-medium text-base-content/60 line-through"
									>
										{formatMoneyAmount(grandTotal)}
									</div>
									<div
										class="font-mono text-base-content tabular-nums"
									>
										{formatMoneyAmount(netTotal)}
									</div>
								{:else}
									<div class="font-mono tabular-nums">
										{formatMoneyAmount(grandTotal)}
									</div>
								{/if}
							</div>

							<WashTooltip
								tooltipText={tr(
									msg.op_billing_discount_open,
									'Discount'
								)}
								className=""
							>
								<WashButton
									className="btn-primary btn-sm btn-circle"
									disabled={!billingMeta}
									onClick={() => {
										if (billingMeta) isDiscountModalOpen = true;
									}}
								>
									<LucideStrikeThrough className="size-4" />
								</WashButton>
							</WashTooltip>
						</div>
					</div>

					{#if billingMeta?.discountedByStaff || billingMeta?.printedByStaff}
						<div
							class="mt-1 space-y-0.5 text-xs text-base-content/60"
						>
							{#if billingMeta?.discountedByStaff}
								<div>
									{tr(msg.op_billing_discounted_by, 'Discounted by')}
									{staffDisplayName(billingMeta.discountedByStaff) ||
										'—'}
								</div>
							{/if}
							{#if billingMeta?.printedByStaff}
								<div>
									{tr(msg.op_billing_printed_by, 'Printed by')}
									{staffDisplayName(billingMeta.printedByStaff) ||
										'—'}
								</div>
							{/if}
						</div>
					{/if}

					<div
						class="divide-y divide-base-300 rounded-box border border-base-300"
					>
						{#each groups as group (group.subCategoryId ?? group.subCategoryName)}
							<div class="collapse-arrow collapse bg-base-100">
								<input type="checkbox" checked />
								<div
									class="collapse-title flex items-center justify-between gap-4 text-sm font-medium"
								>
									<span class="truncate">{group.subCategoryName}</span
									>
									<span
										class="font-mono text-base-content/80 tabular-nums"
									>
										{formatMoneyAmount(group.subtotal)}
									</span>
								</div>
								<div class="collapse-content">
									<ul class="space-y-1 text-sm">
										{#each group.lines as line (opBillingLineRowKey(line))}
											<li
												class="flex items-center justify-between gap-3 rounded-box bg-base-200/40 px-3 py-1.5"
											>
												<div class="min-w-0">
													<p class="truncate font-medium">
														{line.serviceName ??
															tr(
																msg.op_billing_service_fallback,
																'Service'
															)}
													</p>
													<p class="text-xs text-base-content/60">
														{#if line.orderNo}
															{tr(
																msg.op_billing_order_prefix,
																'Order'
															)}:
															{line.orderNo}
														{/if}
													</p>
												</div>
												<div
													class="text-right font-mono text-sm tabular-nums"
												>
													{formatMoneyAmount(lineTotal(line))}
												</div>
											</li>
										{/each}
									</ul>
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
	<WashModal
		groupName="op-billing-discount-modal"
		open={true}
		onClose={() => (isDiscountModalOpen = false)}
	>
		<WashModalBox
			className="max-w-md"
			onClose={() => (isDiscountModalOpen = false)}
		>
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 class="text-lg font-semibold">
						{tr(msg.op_billing_discount_title, 'Discount')}
					</h2>
					<p class="mt-1 text-sm text-base-content/60">
						{tr(
							msg.op_billing_discount_subtitle,
							'Apply a discount to the grand total.'
						)}
					</p>
				</div>
			</div>

			<div class="mt-4 space-y-3">
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text">
							{tr(
								msg.op_billing_discount_type_label,
								'Discount type'
							)}
						</span>
					</div>
					<select
						class="select-bordered select w-full"
						value={String(discountType)}
						onchange={(e) => {
							const v = Number(
								(e.currentTarget as HTMLSelectElement).value
							);
							discountType = (
								Number.isFinite(v) ? v : BillingDiscountTypeEnum.NONE
							) as BillingDiscountTypeEnum;
						}}
					>
						<option value={String(BillingDiscountTypeEnum.NONE)}>
							{tr(msg.op_billing_discount_type_none, 'None')}
						</option>
						<option value={String(BillingDiscountTypeEnum.PERCENT)}>
							{tr(
								msg.op_billing_discount_type_percent,
								'Percent (%)'
							)}
						</option>
						<option
							value={String(BillingDiscountTypeEnum.FIXED_AMOUNT)}
						>
							{tr(
								msg.op_billing_discount_type_fixed_amount,
								'Fixed amount'
							)}
						</option>
					</select>
				</label>

				<label class="form-control w-full">
					<div class="label">
						<span class="label-text">
							{tr(msg.op_billing_discount_amount_label, 'Amount')}
						</span>
						<span class="label-text-alt text-base-content/60">
							{#if discountType === BillingDiscountTypeEnum.PERCENT}
								{tr(
									msg.op_billing_discount_amount_hint_percent,
									'0–100'
								)}
							{:else if discountType === BillingDiscountTypeEnum.FIXED_AMOUNT}
								{tr(
									msg.op_billing_discount_amount_hint_amount,
									'Cannot exceed total'
								)}
							{:else}
								{tr(msg.op_billing_discount_amount_hint_none, '—')}
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
							msg.op_billing_discount_amount_placeholder,
							'0'
						)}
						disabled={discountType === BillingDiscountTypeEnum.NONE}
						bind:value={discountInput}
					/>
				</label>

				<div class="rounded-box bg-base-200/40 p-3 text-sm">
					<div class="flex items-center justify-between gap-3">
						<span class="text-base-content/70">
							{tr(msg.op_billing_discount_preview_label, 'Preview')}
						</span>
						<span class="font-mono tabular-nums">
							-{formatMoneyAmount(discountValue)}
						</span>
					</div>
					<div
						class="mt-1 flex items-center justify-between gap-3 font-semibold"
					>
						<span
							>{tr(
								msg.op_billing_discount_net_total_label,
								'Net total'
							)}</span
						>
						<span class="font-mono tabular-nums">
							{formatMoneyAmount(netTotal)}
						</span>
					</div>
				</div>
			</div>

			<div class="modal-action">
				<WashButton
					className="btn-ghost"
					onClick={() => {
						discountType = BillingDiscountTypeEnum.NONE;
						discountInput = '';
					}}
				>
					{tr(msg.op_billing_discount_clear, 'Clear')}
				</WashButton>
				<WashButton
					className="btn-primary"
					disabled={visitLevelDiscountLocked}
					onClick={() => void applyDiscount()}
				>
					{tr(msg.op_billing_discount_apply, 'Apply')}
				</WashButton>
			</div>
		</WashModalBox>
	</WashModal>
{/if}

{#if isHistoryModalOpen}
	<WashModal
		groupName="op-billing-history-modal"
		open={true}
		onClose={() => (isHistoryModalOpen = false)}
	>
		<WashModalBox
			className="max-w-5xl"
			onClose={() => (isHistoryModalOpen = false)}
		>
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 class="text-lg font-semibold">
						{tr(undefined, 'Bill history')}
					</h2>
					<p class="mt-1 text-sm text-base-content/60">
						{tr(
							undefined,
							'Print any previous OP bill for this visit.'
						)}
					</p>
				</div>
				<WashButton
					className="btn-outline btn-sm mr-6"
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
				<table class="table w-full table-zebra text-sm">
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
										{formatPrintDate(b.printedAt)}
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
										{#if b.printedAt}
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

			<div class="modal-action">
				<WashButton
					className="btn-primary"
					onClick={() => (isHistoryModalOpen = false)}
				>
					{tr(undefined, 'Close')}
				</WashButton>
			</div>
		</WashModalBox>
	</WashModal>
{/if}
