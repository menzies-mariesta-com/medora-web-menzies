<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { InvPoStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		formatPurchaseQtyCellWithIssueEquivalent,
		itemUnitMastersResponseToCatalog,
		trimInventoryNumericDisplay
	} from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const toastService = new ToastService();
	const msg = m as unknown as Record<
		string,
		(() => string) | undefined
	>;

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

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const poId = $derived(
		typeof page.params.po_id === 'string' ? page.params.po_id : ''
	);

	const poListPath = $derived(
		hekaHospitalPageUrl(
			hospitalId,
			'/heka/home/inventory/purchase-order' as any
		)
	);

	const hospitalName = $derived(
		typeof (page.data as { currentHospitalName?: unknown })
			?.currentHospitalName === 'string'
			? ((page.data as { currentHospitalName?: string | null })
					.currentHospitalName ??
					'') ||
					''
			: ''
	);

	type PoLine = {
		id: number;
		prLineId: number | null;
		itemId: number;
		quantity: string;
		unitId: number;
		unitPrice: string;
		lineTotal: string;
		qtyReceivedCumulative: string;
		itemName?: string | null;
		itemUnitMasterId?: number | null;
		itemUnitMasterConversion?: string | null;
	};

	type LogRow = {
		id: number;
		level: number;
		action: number;
		remarks: string | null;
		approvedBy: string;
		approvedByName?: string | null;
		createdAt: string;
	};

	type PoDetail = {
		id: string;
		poNo?: string | null;
		prId: string | null;
		linkedRequisitionNo?: string | null;
		supplierId: number;
		supplierName?: string | null;
		storeName?: string | null;
		statusTaggingId: number;
		statusName?: string | null;
		currentLevel: number;
		totalAmount: string;
		canApprove?: boolean;
		lines: PoLine[];
	};

	let detail = $state<PoDetail | null>(null);
	let detailLoading = $state(false);
	let iumCatalogById = $state(new Map());
	let didAutoPrint = false;

	const poCanPrint = $derived.by(() => {
		if (!detail) return false;
		return [
			InvPoStatusTaggingEnum.APPROVED,
			InvPoStatusTaggingEnum.SENT_TO_SUPPLIER,
			InvPoStatusTaggingEnum.PARTIALLY_RECEIVED,
			InvPoStatusTaggingEnum.CLOSED
		].includes(detail.statusTaggingId);
	});

	const poAllowsLineClose = $derived.by(() => {
		if (!detail) return false;
		return ![
			InvPoStatusTaggingEnum.DRAFT,
			InvPoStatusTaggingEnum.REJECTED,
			InvPoStatusTaggingEnum.SENT_BACK
		].includes(detail.statusTaggingId);
	});

	function isLineClosable(line: PoLine) {
		const ordered = Number(line.quantity);
		const received = Number(line.qtyReceivedCumulative);
		if (!Number.isFinite(ordered) || !Number.isFinite(received))
			return false;
		return received < ordered;
	}

	async function load() {
		if (!hospitalId || !poId) return;
		detailLoading = true;
		try {
			const [res, iumRes] = await Promise.all([
				fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order?id=${encodeURIComponent(poId)}`,
					{ method: 'GET' }
				),
				fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?mode=itemUnitMasters`,
					{ method: 'GET' }
				)
			]);
			if (iumRes.ok) {
				const iumRows = (await iumRes.json()) as {
					id: number;
					purchaseConversionFactor?: string | number | null;
					issueConversionFactor?: string | number | null;
					issueUnitName?: string | null;
				}[];
				iumCatalogById = itemUnitMastersResponseToCatalog(iumRows);
			} else {
				iumCatalogById = new Map();
			}
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as PoDetail | null;
			detail = j;
		} catch (e) {
			toastService.addErrorToast('Could not load purchase order', e);
		} finally {
			detailLoading = false;
		}
	}

	async function closeLine(lineId: number) {
		if (!hospitalId || !poId) return;
		if (!confirm(m.inv_po_close_line_confirm())) return;

		detailLoading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order/close-line`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ poId, lineId })
				}
			);
			if (!res.ok) {
				const t = await res.text();
				toastService.addToast(
					'Action failed',
					StatusColorEnum.ERROR,
					t || String(res.status)
				);
				return;
			}

			const j = (await res.json()) as PoDetail;
			detail = j;
			toastService.addSuccessToast(m.inv_po_close_line_success());
		} catch (e) {
			toastService.addErrorToast('Action failed', e);
		} finally {
			detailLoading = false;
		}
	}

	async function resubmitPo() {
		if (!hospitalId || !poId) return;
		detailLoading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order/resubmit`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ poId })
				}
			);
			if (!res.ok) {
				const t = await res.text();
				toastService.addToast(
					'Action failed',
					StatusColorEnum.ERROR,
					t || String(res.status)
				);
				return;
			}
			const j = (await res.json()) as PoDetail;
			detail = j;
		} catch (e) {
			toastService.addErrorToast('Action failed', e);
		} finally {
			detailLoading = false;
		}
	}

	$effect(() => {
		void poId;
		void hospitalId;
		void load();
	});

	$effect(() => {
		const shouldAutoPrint =
			page.url.searchParams.get('print') === '1';
		if (!shouldAutoPrint || didAutoPrint) return;
		if (!detail || !poCanPrint) return;
		if (typeof window === 'undefined') return;

		didAutoPrint = true;
		window.print();

		const url = new URL(page.url);
		url.searchParams.delete('print');
		const next = `${url.pathname}${url.search}${url.hash}`;
		history.replaceState(history.state, '', next);
	});

	const lineColumns = $derived.by((): MariTableColumn<PoLine>[] => {
		const cat = iumCatalogById;
		return [
			{
				id: 'itemName',
				header: m.inv_common_item(),
				field: 'itemName',
				format: (_v, row) => row.itemName ?? '—'
			},
			{
				id: 'itemUnitMasterConversion',
				header: m.inv_common_unit(),
				field: 'itemUnitMasterConversion',
				widthClass: 'min-w-[12rem] max-w-md',
				headerClass: 'min-w-[12rem] max-w-md',
				cellClass: 'whitespace-normal align-middle',
				filterable: false,
				format: (_v, row) => row.itemUnitMasterConversion ?? '—'
			},
			{
				id: 'quantity',
				header: m.inv_common_quantity(),
				field: 'quantity',
				format: (_v, row) =>
					formatPurchaseQtyCellWithIssueEquivalent(
						{
							quantity: String(row.quantity).trim(),
							itemUnitMasterId: row.itemUnitMasterId,
							iumList: []
						},
						cat
					)
			},
			{
				id: 'unitPrice',
				header: m.inv_po_line_unit_price(),
				field: 'unitPrice',
				format: (_v, row) => {
					const t = String(row.unitPrice ?? '').trim();
					return t ? trimInventoryNumericDisplay(t, 4) : '—';
				}
			},
			{
				id: 'lineTotal',
				header: m.inv_po_line_total(),
				field: 'lineTotal',
				format: (_v, row) => {
					const t = String(row.lineTotal ?? '').trim();
					return t ? trimInventoryNumericDisplay(t, 4) : '—';
				}
			},
			{
				id: 'qtyReceivedCumulative',
				header: `${m.inv_grn_line_purchased_qty()} Σ`,
				field: 'qtyReceivedCumulative',
				format: (_v, row) =>
					formatPurchaseQtyCellWithIssueEquivalent(
						{
							quantity: String(row.qtyReceivedCumulative).trim(),
							itemUnitMasterId: row.itemUnitMasterId,
							iumList: []
						},
						cat
					)
			},
			{
				id: 'qtyToReceive',
				header: m.inv_po_line_to_receive(),
				field: 'qtyReceivedCumulative',
				filterable: false,
				format: (_v, row) => {
					const o = Number(row.quantity);
					const r = Number(row.qtyReceivedCumulative);
					if (!Number.isFinite(o) || !Number.isFinite(r)) return '—';
					const toReceive = String(Math.max(0, o - r));
					return formatPurchaseQtyCellWithIssueEquivalent(
						{
							quantity: toReceive,
							itemUnitMasterId: row.itemUnitMasterId,
							iumList: []
						},
						cat
					);
				}
			}
		];
	});
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		{#if detail}
			<div id="po-print-sheet" class="print-only">
				<div class="print-header">
					<div class="print-brand">
						<img class="print-logo" src={HekaLogo} alt="" />
						<div class="print-titles">
							<div class="print-hospital">
								{hospitalName || 'Hospital'}
							</div>
							<div class="print-subtitle">
								{m.inv_po_detail_title()}
							</div>
						</div>
					</div>

					<div class="print-meta">
						<div class="print-meta-row">
							<span class="print-meta-label">{m.inv_po_no()}:</span>
							<span class="print-meta-value"
								>{detail.poNo ?? '—'}</span
							>
						</div>
						<div class="print-meta-row">
							<span class="print-meta-label"
								>{m.inv_po_select_supplier()}:</span
							>
							<span class="print-meta-value"
								>{detail.supplierName ?? '—'}</span
							>
						</div>
					</div>
				</div>

				<h2 class="print-section-title">{m.inv_po_lines()}</h2>
				<div class="print-table-wrap">
					<table class="print-table">
						<thead>
							<tr>
								<th>{m.inv_common_item()}</th>
								<th>{m.inv_common_unit()}</th>
								<th class="print-num">{m.inv_common_quantity()}</th>
								<th class="print-num">{m.inv_po_line_unit_price()}</th
								>
								<th class="print-num">{m.inv_po_line_total()}</th>
							</tr>
						</thead>
						<tbody>
							{#if detail.lines.length === 0}
								<tr>
									<td colspan="5" class="print-empty">No lines</td>
								</tr>
							{:else}
								{#each detail.lines as line (line.id)}
									<tr>
										<td>{line.itemName ?? '—'}</td>
										<td>{line.itemUnitMasterConversion ?? '—'}</td>
										<td class="print-num">{line.quantity}</td>
										<td class="print-num"
											>{trimInventoryNumericDisplay(
												String(line.unitPrice ?? ''),
												4
											) || '—'}</td
										>
										<td class="print-num"
											>{trimInventoryNumericDisplay(
												String(line.lineTotal ?? ''),
												4
											) || '—'}</td
										>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<div class="no-print mb-4 flex flex-wrap items-center gap-2">
			<DaisyUiTooltip
				tooltipText={m.inv_common_back_to_list()}
				className="d-tooltip-ghost d-tooltip-top"
			>
				<DaisyUiButton
					type="button"
					className="d-btn-sm d-btn-ghost d-btn-square"
					onClick={() => void goto(resolve(poListPath as any))}
				>
					<LucideArrowLeft className="size-4" />
				</DaisyUiButton>
			</DaisyUiTooltip>
			<DaisyUiCardBodyTitle className="mb-0">
				{m.inv_po_detail_title()}
			</DaisyUiCardBodyTitle>

			{#if detail && poCanPrint}
				<div class="no-print ml-auto flex items-center gap-2">
					<DaisyUiTooltip
						tooltipText={tr(msg.inv_common_print, 'Print')}
						className="d-tooltip-left"
					>
						<DaisyUiButton
							type="button"
							className="d-btn-sm d-btn-outline gap-2"
							disabled={detailLoading}
							onClick={() => {
								if (typeof window !== 'undefined') window.print();
							}}
						>
							<LucidePrinter className="size-4" />
							{tr(msg.inv_common_print, 'Print')}
						</DaisyUiButton>
					</DaisyUiTooltip>
				</div>
			{/if}
		</div>
		{#if !poId}
			<p class="text-sm text-base-content/70">
				{m.inv_po_approve_need_poId()}
			</p>
		{:else if detailLoading && !detail}
			<p class="text-sm text-base-content/70">{m.loading()}</p>
		{:else if detail}
			<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2 rounded-lg bg-base-200 p-4 text-sm">
					<div class="flex flex-col gap-1">
						<div
							class="print-only flex justify-between border-b border-base-300 pb-1"
						>
							<span class="opacity-70">{m.inv_po_no()}:</span>
							<strong class="text-right font-medium"
								>{detail.poNo ?? '—'}</strong
							>
						</div>
						<div
							class="flex justify-between border-b border-base-300 pb-1"
						>
							<span class="opacity-70">{m.status()}:</span>
							<strong class="text-right font-medium text-primary"
								>{detail.statusName ?? '—'}</strong
							>
						</div>
						<div
							class="flex justify-between border-b border-base-300 pb-1"
						>
							<span class="opacity-70">{m.inv_common_level()}:</span>
							<strong class="text-right font-medium"
								>{detail.currentLevel}</strong
							>
						</div>
						<div
							class="flex justify-between border-b border-base-300 pb-1"
						>
							<span class="opacity-70">{m.inv_common_store()}:</span>
							<strong class="text-right font-medium"
								>{detail.storeName ?? '—'}</strong
							>
						</div>
						<div
							class="flex justify-between border-b border-base-300 pb-1"
						>
							<span class="opacity-70">{m.inv_po_linked_pr()}</span>
							<strong class="text-right font-medium">
								{#if detail.prId}
									<span class="d-link d-link-primary">
										{detail.linkedRequisitionNo?.trim()
											? detail.linkedRequisitionNo
											: detail.prId}
									</span>
								{:else}
									—
								{/if}
							</strong>
						</div>
						<div class="flex justify-between pb-1">
							<span class="opacity-70"
								>{m.inv_po_select_supplier()}:</span
							>
							<strong class="text-right font-medium"
								>{detail.supplierName ?? '—'}</strong
							>
						</div>
					</div>
				</div>
				<div class="flex flex-col justify-end space-y-4">
					<div
						class="mb-2 rounded-lg bg-primary/10 p-4 text-right text-primary"
					>
						<span
							class="mb-1 block text-xs font-semibold tracking-wider uppercase opacity-80"
							>{m.inv_po_line_unit_price()} Total</span
						>
						<span class="text-2xl font-bold"
							>{detail.totalAmount}</span
						>
					</div>
				</div>
			</div>

			{#if detail.statusTaggingId === InvPoStatusTaggingEnum.REJECTED}
				<div class="mb-6">
					<DaisyUiButton
						className="d-btn-outline d-btn-primary"
						disabled={detailLoading}
						onClick={() => resubmitPo()}
					>
						{m.inv_po_resubmit()}
					</DaisyUiButton>
				</div>
			{/if}

			<h2
				class="no-print mt-4 mb-3 text-lg font-semibold text-base-content/90"
			>
				{m.inv_po_lines()}
			</h2>
			<div class={`${TableEnum.HEIGHT} no-print mb-8 min-w-0`}>
				<MariTable
					columns={lineColumns}
					rows={detail.lines}
					isLoading={detailLoading}
					showRowActions={true}
					actionsVariant="none"
					showRefreshButton={false}
					emptyMessage="No lines"
				>
					{#snippet rowActions(row)}
						<div class="no-print flex flex-col items-center gap-1">
							{#if poAllowsLineClose && isLineClosable(row)}
								<DaisyUiTooltip
									tooltipText={m.inv_po_close_line()}
									className="d-tooltip-warning d-tooltip-top"
								>
									<DaisyUiButton
										className="d-btn-sm d-btn-ghost d-btn-warning"
										disabled={detailLoading}
										onClick={() => void closeLine(row.id)}
									>
										<LucideX className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
							{/if}
						</div>
					{/snippet}
				</MariTable>
			</div>
		{/if}
	</DaisyUiCardBody>
</DaisyUiCard>

<style>
	.print-only {
		display: none;
	}

	.print-meta {
		margin-top: 10px;
		display: grid;
		grid-template-columns: 1fr;
		gap: 6px;
		font-size: 12px;
		color: #111827;
	}

	.print-meta-row {
		display: flex;
		gap: 8px;
		align-items: baseline;
	}

	.print-meta-label {
		font-weight: 600;
		color: #374151;
		min-width: 90px;
	}

	.print-meta-value {
		font-weight: 700;
		color: #111827;
	}

	.print-section-title {
		margin-top: 14px;
		margin-bottom: 8px;
		font-size: 14px;
		font-weight: 700;
		color: #111827;
	}

	.print-table-wrap {
		overflow: visible;
	}

	.print-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 11px;
		color: #111827;
	}

	.print-table th,
	.print-table td {
		border: 1px solid #000;
		padding: 6px 8px;
		vertical-align: top;
	}

	.print-table th {
		font-weight: 700;
		text-align: left;
	}

	.print-num {
		text-align: right;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.print-empty {
		text-align: center;
		padding: 12px;
	}

	.print-header {
		margin-bottom: 12px;
	}

	.print-brand {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-bottom: 10px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.12);
	}

	.print-logo {
		width: 84px;
		height: auto;
		object-fit: contain;
	}

	.print-hospital {
		font-size: 16px;
		font-weight: 700;
		color: #111827;
		line-height: 1.2;
	}

	.print-subtitle {
		font-size: 12px;
		font-weight: 600;
		color: #374151;
		margin-top: 2px;
	}

	@media print {
		:global(body) {
			margin: 0;
		}

		/* Hide the entire app chrome and only show the print sheet */
		:global(body *),
		:global(html *) {
			visibility: hidden !important;
		}

		#po-print-sheet,
		#po-print-sheet * {
			visibility: visible !important;
		}

		#po-print-sheet {
			display: block !important;
			position: fixed;
			inset: 0;
			padding: 14mm 12mm;
			background: #fff;
		}

		.print-brand {
			border-bottom-color: #000;
		}
	}
</style>
