<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiModalBox from '$lib/component/daisyui/modal/box/DaisyUiModalBox.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import LucideStrikeThrough from '$lib/component/own/library/lucide/LucideStrikeThrough.svelte';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import { m } from '$lib/paraglide/messages';
	import { BillingDiscountTypeEnum } from '$lib/model/enum/billing-discount-type.enum';
	import { formatMoneyAmount } from '$lib/util/number-display.util';
	import { VisitState } from '$lib/state/visit.state.svelte';

	const msg = m as any;

	const visitId = $derived(VisitState.visitId);
	const hospitalId = $derived(page.params.hospital_id ?? '');

	function tr(getter: (() => string) | undefined, fallback: string): string {
		try {
			return typeof getter === 'function' ? getter() : fallback;
		} catch {
			return fallback;
		}
	}

	type BillingLine = {
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
	};

	type BillingGroup = {
		subCategoryId: number | null;
		subCategoryName: string;
		lines: BillingLine[];
		subtotal: number;
	};

	type VisitSummary = {
		id: number;
		visitNo: string;
		hospitalName: string | null;
		branchName: string | null;
		patientName: string | null;
		patientCode: string | null;
		visitDateIso: string | null;
		doctorName: string | null;
	};

	type StaffSummary = {
		id?: number | string | null;
		userId?: number | string | null;
		title?: { name?: string | null } | null;
		firstName?: string | null;
		middleName?: string | null;
		lastName?: string | null;
	};

	type BillingMeta = {
		discountTypeId?: number | null;
		discountPercent?: number | string | null;
		discountAmount?: number | string | null;
		linesSubtotal?: number | string | null;
		totalAmount?: number | string | null;
		discountedByStaff?: StaffSummary | null;
		discountedAt?: string | null;
		printedByStaff?: StaffSummary | null;
		printedAt?: string | null;
	};

	let isLoading = $state(false);
	let loadError = $state('');
	let groups = $state<BillingGroup[]>([]);
	let grandTotal = $state(0);
	let visitSummary = $state<VisitSummary | null>(null);
	let billingMeta = $state<BillingMeta | null>(null);

	let isDiscountModalOpen = $state(false);
	let discountType = $state<BillingDiscountTypeEnum>(BillingDiscountTypeEnum.NONE);
	let discountInput = $state('');

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

	function lineTotal(line: BillingLine): number {
		const amount = Number(line.serviceAmount ?? 0) || 0;
		const tax = Number(line.serviceTaxAmount ?? 0) || 0;
		const discount = Number(line.discount ?? 0) || 0;
		const unit = line.serviceUnit && line.serviceUnit > 0 ? line.serviceUnit : 1;
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

	function escapeHtml(value: unknown): string {
		return String(value ?? '')
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
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

	function staffDisplayName(staff: StaffSummary | null | undefined): string {
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

	async function postOpBillingUpdate(payload: Record<string, unknown>) {
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/billing/op-billing/visit-lines`,
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
			loadError = '';
			return;
		}

		const visitNumeric = Number(currentVisitId);
		if (!visitNumeric || !Number.isFinite(visitNumeric) || visitNumeric <= 0) {
			groups = [];
			grandTotal = 0;
			visitSummary = null;
			billingMeta = null;
			loadError = '';
			return;
		}

		isLoading = true;
		loadError = '';
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/billing/op-billing/visit-lines?visitId=${visitNumeric}`
			);
			if (!res.ok) {
				groups = [];
				grandTotal = 0;
				visitSummary = null;
				billingMeta = null;
				loadError = tr(msg.op_billing_load_failed, 'Failed to load billing lines.');
				return;
			}
			const data = (await res.json()) as {
				items?: BillingLine[];
				visit?: VisitSummary | null;
				billing?: BillingMeta | null;
			};
			const lines = (data.items ?? []).map((row) => ({
				...row
			}));
			visitSummary = data.visit ?? null;
			billingMeta = data.billing ?? null;
			const grouped = groupLines(lines);
			groups = grouped;
			grandTotal = grouped.reduce((sum, g) => sum + g.subtotal, 0);

			const b = data.billing ?? null;
			if (!b?.discountTypeId || b.discountTypeId === BillingDiscountTypeEnum.NONE) {
				discountType = BillingDiscountTypeEnum.NONE;
				discountInput = '';
			} else if (b.discountTypeId === BillingDiscountTypeEnum.PERCENT) {
				discountType = BillingDiscountTypeEnum.PERCENT;
				const pct = Number(b.discountPercent ?? 0);
				discountInput = Number.isFinite(pct) && pct > 0 ? String(pct) : '';
			} else if (b.discountTypeId === BillingDiscountTypeEnum.FIXED_AMOUNT) {
				discountType = BillingDiscountTypeEnum.FIXED_AMOUNT;
				const amt = Number(b.discountAmount ?? 0);
				discountInput = Number.isFinite(amt) && amt > 0 ? String(amt) : '';
			}
		} catch (err) {
			console.error(err);
			groups = [];
			grandTotal = 0;
			visitSummary = null;
			billingMeta = null;
			loadError = tr(msg.op_billing_load_failed, 'Failed to load billing lines.');
		} finally {
			isLoading = false;
		}
	}

	async function applyDiscount() {
		if (!visitId) return;
		const visitNumeric = Number(visitId);
		if (!visitNumeric || !Number.isFinite(visitNumeric) || visitNumeric <= 0) return;

		const payload =
			discountType === BillingDiscountTypeEnum.PERCENT
				? {
						action: 'discount',
						visitId: visitNumeric,
						discountTypeId: BillingDiscountTypeEnum.PERCENT,
						discountPercent: Math.min(100, Math.max(0, discountInputNumber)),
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
				loadError = tr(msg.op_billing_discount_save_failed, 'Failed to save discount.');
				return;
			}
			isDiscountModalOpen = false;
			await loadBillingLines(String(visitNumeric));
		} catch (err) {
			console.error(err);
			loadError = tr(msg.op_billing_discount_save_failed, 'Failed to save discount.');
		}
	}

	function printOpBill() {
		if (!groups.length || !visitId) return;

		const visitNumeric = Number(visitId);
		if (visitNumeric && Number.isFinite(visitNumeric) && visitNumeric > 0) {
			void postOpBillingUpdate({ action: 'printed', visitId: visitNumeric }).catch(() => {
				// silent
			});
		}

		const v = visitSummary;
		const hospitalName =
			v?.hospitalName?.trim() || tr(msg.op_billing_title, 'OP Billing');
		const patient = v?.patientName?.trim() || '—';
		const code = v?.patientCode?.trim() || '—';
		const visitNo = v?.visitNo ?? String(visitId);
		const visitWhen = formatPrintDate(v?.visitDateIso);
		const doctor = v?.doctorName?.trim() || '—';
		const branch = v?.branchName?.trim() || '—';

		const printedAt = `${tr(msg.op_billing_print_generated, 'Printed')}: ${new Date().toLocaleString()}`;

		const rowsHtml = groups
			.map((g) => {
				const lineRows = g.lines
					.map(
						(line) => `
          <tr>
            <td class="svc">${escapeHtml(line.serviceName ?? 'Service')}</td>
            <td class="ord">${escapeHtml(line.orderNo ?? '—')}</td>
            <td class="amt">${formatMoneyAmount(lineTotal(line))}</td>
          </tr>`
					)
					.join('');

				return `
        <section class="cat-block">
          <h3 class="cat-title">${escapeHtml(g.subCategoryName)}</h3>
          <table class="line-table">
            <thead>
              <tr>
                <th>${escapeHtml(tr(msg.op_billing_print_service, 'Service'))}</th>
                <th>${escapeHtml(tr(msg.op_billing_print_order, 'Order'))}</th>
                <th class="num">${escapeHtml(tr(msg.op_billing_print_amount, 'Amount'))}</th>
              </tr>
            </thead>
            <tbody>
              ${lineRows}
            </tbody>
            <tfoot>
              <tr class="subtotal-row">
                <td colspan="2">${escapeHtml(tr(msg.op_billing_print_subtotal, 'Subtotal'))}</td>
                <td class="num">${formatMoneyAmount(g.subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </section>`;
			})
			.join('');

		const totalLabel = escapeHtml(tr(msg.op_billing_print_grand_total, 'Grand total'));
		const discountLabel = escapeHtml(tr(msg.op_billing_print_discount, 'Discount'));
		const netLabel = escapeHtml(tr(msg.op_billing_print_net_total, 'Net total'));
		const effectiveGrandTotal = hasDiscount ? netTotal : grandTotal;
		const grandBlockHtml = hasDiscount
			? `<div class="grand grand--stack">
        <div class="grand-row">
          <span>${totalLabel}</span>
          <span class="grand-amt grand-amt--strike">${formatMoneyAmount(grandTotal)}</span>
        </div>
        <div class="grand-row">
          <span>${discountLabel}</span>
          <span class="grand-disc">-${formatMoneyAmount(discountValue)}</span>
        </div>
        <div class="grand-row grand-row--net">
          <span>${netLabel}</span>
          <span class="grand-amt">${formatMoneyAmount(effectiveGrandTotal)}</span>
        </div>
      </div>`
			: `<div class="grand">
        <span>${totalLabel}</span>
        <span class="grand-amt">${formatMoneyAmount(effectiveGrandTotal)}</span>
      </div>`;

		const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(tr(msg.op_billing_print_document_title, 'OP bill'))}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>
      @page { size: A4; margin: 14mm 16mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: 'Source Sans 3', system-ui, sans-serif;
        font-size: 11px;
        color: #1a1a1a;
        line-height: 1.45;
        background: #fff;
      }
      .sheet { max-width: 720px; margin: 0 auto; }
      .top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 14px;
        border-bottom: 2px solid #0f172a;
      }
      .brand { display: flex; gap: 12px; align-items: center; }
      .logo { width: 72px; height: auto; object-fit: contain; }
      .titles h1 {
        margin: 0;
        font-family: 'Crimson Pro', Georgia, serif;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #0f172a;
      }
      .titles .sub {
        margin: 4px 0 0;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #64748b;
      }
      .meta {
        margin-top: 6px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 6px 14px;
        font-size: 10px;
      }
      .meta dt { color: #64748b; font-weight: 600; }
      .meta dd { margin: 0; font-weight: 500; color: #0f172a; }
      .cat-block { margin-top: 14px; margin-bottom: 1rem; }
      .cat-title {
        margin: 0 0 6px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #334155;
        border-left: 3px solid #0ea5e9;
        padding-left: 8px;
      }
      .line-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
      }
      .line-table th {
        text-align: left;
        padding: 6px 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        font-weight: 600;
        color: #475569;
      }
      .line-table th.num { text-align: right; }
      .line-table td {
        padding: 6px 8px;
        border: 1px solid #e2e8f0;
        vertical-align: top;
      }
      .line-table td.svc { font-weight: 500; }
      .line-table td.ord { color: #64748b; font-size: 9px; }
      .line-table td.amt { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
      .subtotal-row td {
        background: #f1f5f9;
        font-weight: 600;
        border-top: 1px solid #cbd5e1;
      }
      .subtotal-row .num { text-align: right; font-variant-numeric: tabular-nums; }
      .grand {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 2px solid #0f172a;
        display: flex;
        justify-content: flex-end;
        align-items: baseline;
        gap: 12px;
      }
      .grand--stack {
        flex-direction: column;
        align-items: stretch;
        gap: 4px;
      }
      .grand-row {
        display: flex;
        justify-content: flex-end;
        align-items: baseline;
        gap: 12px;
      }
      .grand span:first-child {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #334155;
      }
      .grand .grand-amt {
        font-size: 15px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: #0f172a;
      }
      .grand-amt--strike {
        text-decoration: line-through;
        opacity: 0.7;
        font-weight: 600;
        font-size: 12px;
      }
      .grand-disc {
        font-size: 12px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: #b91c1c;
      }
      .grand-row--net span:first-child { color: #0f172a; }
      @media print {
        .line-table th,
        .subtotal-row td {
          background: #fff !important;
        }
        .cat-title { border-left-color: #000 !important; }
      }
      .foot {
        margin-top: 18px;
        padding-top: 10px;
        border-top: 1px solid #e2e8f0;
        font-size: 9px;
        color: #64748b;
        display: flex;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .thank { font-style: italic; color: #475569; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <header class="top">
        <div class="brand">
          <img class="logo" src="${escapeHtml(HekaLogo)}" alt="" />
          <div class="titles">
            <h1>${escapeHtml(hospitalName)}</h1>
            <p class="sub">${escapeHtml(tr(msg.op_billing_print_statement_title, 'Statement of charges'))}</p>
          </div>
        </div>
      </header>
      <dl class="meta">
        <div><dt>${escapeHtml(tr(msg.op_billing_print_patient, 'Patient'))}</dt><dd>${escapeHtml(patient)}</dd></div>
        <div><dt>${escapeHtml(tr(msg.op_billing_print_patient_code, 'Patient code'))}</dt><dd>${escapeHtml(code)}</dd></div>
        <div><dt>${escapeHtml(tr(msg.op_billing_print_visit_no, 'Visit no.'))}</dt><dd>${escapeHtml(visitNo)}</dd></div>
        <div><dt>${escapeHtml(tr(msg.op_billing_print_date, 'Date'))}</dt><dd>${escapeHtml(visitWhen)}</dd></div>
        <div><dt>${escapeHtml(tr(msg.op_billing_print_doctor, 'Doctor'))}</dt><dd>${escapeHtml(doctor)}</dd></div>
        <div><dt>${escapeHtml(tr(msg.op_billing_print_branch, 'Branch'))}</dt><dd>${escapeHtml(branch)}</dd></div>
      </dl>
      ${rowsHtml}
      ${grandBlockHtml}
      <footer class="foot">
        <span class="thank">${escapeHtml(tr(msg.op_billing_print_thank_you, 'Thank you for choosing us.'))}</span>
        <span>${escapeHtml(printedAt)}</span>
      </footer>
    </div>
  </body>
</html>`;

		let iframe = document.getElementById(
			'op-billing-print-iframe'
		) as HTMLIFrameElement | null;

		if (!iframe) {
			iframe = document.createElement('iframe');
			iframe.id = 'op-billing-print-iframe';
			iframe.style.position = 'fixed';
			iframe.style.right = '0';
			iframe.style.bottom = '0';
			iframe.style.width = '0';
			iframe.style.height = '0';
			iframe.style.border = '0';
			iframe.style.opacity = '0';
			iframe.style.pointerEvents = 'none';
			document.body.appendChild(iframe);
		}

		const win = iframe.contentWindow;
		const doc = win?.document;
		if (!win || !doc) return;

		doc.open();
		doc.write(html);
		doc.close();

		window.setTimeout(() => {
			try {
				win.focus();
				win.print();
			} catch {
				// ignore
			}
		}, 200);
	}

	$effect(() => {
		if (!browser) return;
		void loadBillingLines(visitId);
	});
</script>

<DaisyUiCard>
	<DaisyUiCardBody className="gap-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<DaisyUiCardBodyTitle>{msg.op_billing_title()}</DaisyUiCardBodyTitle>
			{#if visitId && groups.length > 0 && !isLoading && !loadError}
				<DaisyUiTooltip tooltipText={msg.op_billing_print_bill()} className="d-tooltip-left">
					<DaisyUiButton
						className="d-btn-outline d-btn-sm gap-2"
						onClick={() => printOpBill()}
					>
						<LucidePrinter className="size-4" />
						{msg.op_billing_print_bill()}
					</DaisyUiButton>
				</DaisyUiTooltip>
			{/if}
		</div>
		{#if !visitId}
			<p class="text-sm text-base-content/70">
				{msg.op_billing_select_visit_hint()}
			</p>
		{:else}
			<div class="mt-2 space-y-3">
				{#if loadError}
					<p class="text-sm text-error">{loadError}</p>
				{:else if isLoading}
					<p class="text-sm text-base-content/60">
						{tr(msg.op_billing_loading_lines, 'Loading billing lines…')}
					</p>
				{:else if groups.length === 0}
					<p class="text-sm text-base-content/60">
						{tr(
							msg.op_billing_no_services_found,
							'No billable services found for this visit.'
						)}
					</p>
				{:else}
					<div class="flex items-center justify-between gap-3 text-sm font-semibold">
						<span>{tr(msg.op_billing_total_bill, 'Total bill')}</span>
						<div class="flex items-center gap-2">
							<div class="text-right">
								{#if hasDiscount}
									<div class="text-xs font-medium text-base-content/60 line-through">
										{formatMoneyAmount(grandTotal)}
									</div>
									<div class="font-mono tabular-nums text-base-content">
										{formatMoneyAmount(netTotal)}
									</div>
								{:else}
									<div class="font-mono tabular-nums">
										{formatMoneyAmount(grandTotal)}
									</div>
								{/if}
							</div>

							<DaisyUiTooltip
								tooltipText={tr(msg.op_billing_discount_open, 'Discount')}
								className="d-tooltip-left"
							>
								<DaisyUiButton
									className="d-btn-primary d-btn-sm d-btn-circle"
									onClick={() => (isDiscountModalOpen = true)}
								>
									<LucideStrikeThrough className="size-4" />
								</DaisyUiButton>
							</DaisyUiTooltip>
						</div>
					</div>

					{#if billingMeta?.discountedByStaff || billingMeta?.printedByStaff}
						<div class="mt-1 space-y-0.5 text-xs text-base-content/60">
							{#if billingMeta?.discountedByStaff}
								<div>
									{tr(msg.op_billing_discounted_by, 'Discounted by')} {staffDisplayName(billingMeta.discountedByStaff) || '—'}
								</div>
							{/if}
							{#if billingMeta?.printedByStaff}
								<div>
									{tr(msg.op_billing_printed_by, 'Printed by')} {staffDisplayName(billingMeta.printedByStaff) || '—'}
								</div>
							{/if}
						</div>
					{/if}

					<div class="divide-y divide-base-300 rounded-box border border-base-300">
						{#each groups as group (group.subCategoryId ?? group.subCategoryName)}
							<div class="d-collapse d-collapse-arrow bg-base-100">
								<input type="checkbox" checked />
								<div class="d-collapse-title flex items-center justify-between gap-4 text-sm font-medium">
									<span class="truncate">{group.subCategoryName}</span>
									<span class="font-mono tabular-nums text-base-content/80">
										{formatMoneyAmount(group.subtotal)}
									</span>
								</div>
								<div class="d-collapse-content">
									<ul class="space-y-1 text-sm">
										{#each group.lines as line (line.id)}
											<li class="flex items-center justify-between gap-3 rounded-box bg-base-200/40 px-3 py-1.5">
												<div class="min-w-0">
													<p class="truncate font-medium">
														{line.serviceName ?? tr(msg.op_billing_service_fallback, 'Service')}
													</p>
													<p class="text-xs text-base-content/60">
														{#if line.orderNo}
															{tr(msg.op_billing_order_prefix, 'Order')}:
															{line.orderNo}
														{/if}
													</p>
												</div>
												<div class="text-right text-sm font-mono tabular-nums">
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
	</DaisyUiCardBody>
</DaisyUiCard>

{#if isDiscountModalOpen}
	<DaisyUiModal
		groupName="op-billing-discount-modal"
		open={true}
		onClose={() => (isDiscountModalOpen = false)}
	>
		<DaisyUiModalBox className="max-w-md" onClose={() => (isDiscountModalOpen = false)}>
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 class="text-lg font-semibold">
						{tr(msg.op_billing_discount_title, 'Discount')}
					</h2>
					<p class="mt-1 text-sm text-base-content/60">
						{tr(msg.op_billing_discount_subtitle, 'Apply a discount to the grand total.')}
					</p>
				</div>
			</div>

			<div class="mt-4 space-y-3">
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text">
							{tr(msg.op_billing_discount_type_label, 'Discount type')}
						</span>
					</div>
					<select
						class="d-select d-select-bordered w-full"
						value={String(discountType)}
						onchange={(e) => {
							const v = Number((e.currentTarget as HTMLSelectElement).value);
							discountType = (Number.isFinite(v) ? v : BillingDiscountTypeEnum.NONE) as BillingDiscountTypeEnum;
						}}
					>
						<option value={String(BillingDiscountTypeEnum.NONE)}>
							{tr(msg.op_billing_discount_type_none, 'None')}
						</option>
						<option value={String(BillingDiscountTypeEnum.PERCENT)}>
							{tr(msg.op_billing_discount_type_percent, 'Percent (%)')}
						</option>
						<option value={String(BillingDiscountTypeEnum.FIXED_AMOUNT)}>
							{tr(msg.op_billing_discount_type_fixed_amount, 'Fixed amount')}
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
								{tr(msg.op_billing_discount_amount_hint_percent, '0–100')}
							{:else if discountType === BillingDiscountTypeEnum.FIXED_AMOUNT}
								{tr(msg.op_billing_discount_amount_hint_amount, 'Cannot exceed total')}
							{:else}
								{tr(msg.op_billing_discount_amount_hint_none, '—')}
							{/if}
						</span>
					</div>
					<input
						class="d-input d-input-bordered w-full"
						type="number"
						inputmode="decimal"
						min="0"
						step="0.01"
						placeholder={tr(msg.op_billing_discount_amount_placeholder, '0')}
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
					<div class="mt-1 flex items-center justify-between gap-3 font-semibold">
						<span>{tr(msg.op_billing_discount_net_total_label, 'Net total')}</span>
						<span class="font-mono tabular-nums">
							{formatMoneyAmount(netTotal)}
						</span>
					</div>
				</div>
			</div>

			<div class="d-modal-action">
				<DaisyUiButton
					className="d-btn-ghost"
					onClick={() => {
						discountType = BillingDiscountTypeEnum.NONE;
						discountInput = '';
					}}
				>
					{tr(msg.op_billing_discount_clear, 'Clear')}
				</DaisyUiButton>
				<DaisyUiButton
					className="d-btn-primary"
					onClick={() => void applyDiscount()}
				>
					{tr(msg.op_billing_discount_apply, 'Apply')}
				</DaisyUiButton>
			</div>
		</DaisyUiModalBox>
	</DaisyUiModal>
{/if}
