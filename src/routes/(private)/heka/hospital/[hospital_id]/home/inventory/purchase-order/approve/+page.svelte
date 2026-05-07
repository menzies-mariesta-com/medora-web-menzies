<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import InventoryTableTextCell from '$lib/component/own/local/private/heka/inventory/InventoryTableTextCell.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import {
		InvApprovalActionEnum,
		InvPoStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		formatPurchaseQtyCellWithIssueEquivalent,
		itemUnitMastersResponseToCatalog,
		trimInventoryNumericDisplay
	} from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);
	const poId = $derived(page.url.searchParams.get('poId') ?? '');

	const poListPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/purchase-order' as any)
	);

	type PoLine = {
		id: number;
		prLineId: number | null;
		itemId: number;
		quantity: string;
		unitId: number;
		unitPrice: string;
		lineTotal: string;
		manufacturerId: number | null;
		qtyReceivedCumulative: string;
		itemName?: string | null;
		isBatchRequired?: boolean;
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
		lines: PoLine[];
	};

	let detail = $state<PoDetail | null>(null);
	let loading = $state(false);
	let remarks = $state('');
	let lineQtyDraft = $state<Record<number, string>>({});
	let linePriceDraft = $state<Record<number, string>>({});
	let baselineQty = $state<Record<number, string>>({});
	let baselinePrice = $state<Record<number, string>>({});
	let iumCatalogById = $state(new Map());

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
		if (!Number.isFinite(ordered) || !Number.isFinite(received)) return false;
		return received < ordered;
	}

	function actionLabel(a: number): string {
		if (a === InvApprovalActionEnum.APPROVED) return m.inv_approval_action_approved();
		if (a === InvApprovalActionEnum.REJECTED) return m.inv_approval_action_rejected();
		return String(a);
	}

	function syncPoLineDrafts(d: PoDetail) {
		const q: Record<number, string> = {};
		const p: Record<number, string> = {};
		const bq: Record<number, string> = {};
		const bp: Record<number, string> = {};
		for (const ln of d.lines) {
			q[ln.id] = String(ln.quantity);
			p[ln.id] = String(ln.unitPrice);
			bq[ln.id] = String(ln.quantity);
			bp[ln.id] = String(ln.unitPrice);
		}
		lineQtyDraft = q;
		linePriceDraft = p;
		baselineQty = bq;
		baselinePrice = bp;
	}

	async function load() {
		if (!hospitalId || !poId) return;
		loading = true;
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
			if (j) syncPoLineDrafts(j);
		} catch (e) {
			toastService.addErrorToast('Could not load purchase order', e);
		} finally {
			loading = false;
		}
	}

	function buildPoAdjustments():
		| { lineId: number; quantity: string; unitPrice?: string }[]
		| undefined {
		if (!detail) return undefined;
		const adj: { lineId: number; quantity: string; unitPrice?: string }[] = [];
		for (const ln of detail.lines) {
			const dq = (lineQtyDraft[ln.id] ?? '').trim();
			const dp = (linePriceDraft[ln.id] ?? '').trim();
			const oq = baselineQty[ln.id] ?? String(ln.quantity);
			const op = baselinePrice[ln.id] ?? String(ln.unitPrice);
			if (dq && dq !== oq) {
				const row: { lineId: number; quantity: string; unitPrice?: string } = {
					lineId: ln.id,
					quantity: dq
				};
				if (dp && dp !== op) row.unitPrice = dp;
				adj.push(row);
			} else if (dp && dp !== op) {
				adj.push({ lineId: ln.id, quantity: oq, unitPrice: dp });
			}
		}
		return adj.length ? adj : undefined;
	}

	async function closeLine(lineId: number) {
		if (!hospitalId || !poId) return;
		if (!confirm(m.inv_po_close_line_confirm())) return;

		loading = true;
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
			syncPoLineDrafts(j);
			toastService.addSuccessToast(m.inv_po_close_line_success());
		} catch (e) {
			toastService.addErrorToast('Action failed', e);
		} finally {
			loading = false;
		}
	}

	async function act(action: number) {
		if (!hospitalId || !poId) return;
		loading = true;
		try {
			const lineAdjustments =
				action === InvApprovalActionEnum.APPROVED ? buildPoAdjustments() : undefined;
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order/approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						poId,
						action,
						remarks: remarks.trim() || null,
						...(lineAdjustments ? { lineAdjustments } : {})
					})
				}
			);
			if (!res.ok) {
				const t = await res.text();
				toastService.addToast('Action failed', StatusColorEnum.ERROR, t || String(res.status));
				return;
			}
			const j = (await res.json()) as PoDetail;
			detail = j;
			syncPoLineDrafts(j);
			remarks = '';
		} catch (e) {
			toastService.addErrorToast('Action failed', e);
		} finally {
			loading = false;
		}
	}

	async function resubmitPo() {
		if (!hospitalId || !poId) return;
		loading = true;
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
				toastService.addToast('Action failed', StatusColorEnum.ERROR, t || String(res.status));
				return;
			}
			const j = (await res.json()) as PoDetail;
			detail = j;
			syncPoLineDrafts(j);
		} catch (e) {
			toastService.addErrorToast('Action failed', e);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void poId;
		void hospitalId;
		void load();
	});

	const lineColumns = $derived.by((): MariTableColumn<PoLine>[] => {
		const cat = iumCatalogById;
		const pending = detail?.statusTaggingId === InvPoStatusTaggingEnum.PENDING;
		const qtyCol: MariTableColumn<PoLine> = pending
			? {
					id: 'quantity',
					header: m.inv_common_quantity(),
					field: 'quantity',
					cellComponentGetter: (row) => ({
						component: InventoryTableTextCell,
						props: {
							value: lineQtyDraft[row.id] ?? String(row.quantity),
							onValueChange: (v: string) => {
								lineQtyDraft[row.id] = v;
								lineQtyDraft = { ...lineQtyDraft };
							}
						}
					})
				}
			: {
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
				};
		const priceCol: MariTableColumn<PoLine> = pending
			? {
					id: 'unitPrice',
					header: m.inv_po_line_unit_price(),
					field: 'unitPrice',
					cellComponentGetter: (row) => ({
						component: InventoryTableTextCell,
						props: {
							value: linePriceDraft[row.id] ?? String(row.unitPrice),
							onValueChange: (v: string) => {
								linePriceDraft[row.id] = v;
								linePriceDraft = { ...linePriceDraft };
							}
						}
					})
				}
			: {
					id: 'unitPrice',
					header: m.inv_po_line_unit_price(),
					field: 'unitPrice',
					format: (_v, row) => {
						const t = String(row.unitPrice ?? '').trim();
						return t ? trimInventoryNumericDisplay(t, 4) : '—';
					}
				};
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
			qtyCol,
			priceCol,
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
				header: `${m.inv_grn_line_received_qty()} Σ`,
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
			},
			{
				id: 'batch',
				header: 'Batch?',
				field: 'isBatchRequired',
				format: (_v, row) => (row.isBatchRequired ? 'Y' : '—')
			}
		];
	});

</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<div class="mb-4 flex items-center gap-2">
			<DaisyUiTooltip
				tooltipText={m.inv_common_back_to_list()}
				className="d-tooltip-ghost d-tooltip-right"
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
				{m.inv_page_po_approve_title()}
			</DaisyUiCardBodyTitle>
		</div>
		{#if !poId}
			<p class="text-sm text-base-content/70">{m.inv_po_approve_need_poId()}</p>
		{:else if loading && !detail}
			<p class="text-sm text-base-content/70">{m.loading()}</p>
		{:else if detail}
			<div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="space-y-2 text-sm bg-base-200 p-4 rounded-lg">
					<div class="flex flex-col gap-1">
						<div class="flex justify-between border-b border-base-300 pb-1">
							<span class="opacity-70">{m.inv_po_no()}:</span>
							<strong class="font-medium text-right">{detail.poNo ?? '—'}</strong>
						</div>
						<div class="flex justify-between border-b border-base-300 pb-1">
							<span class="opacity-70">{m.status()}:</span>
							<strong class="font-medium text-right text-primary">{detail.statusName ?? '—'}</strong>
						</div>
						<div class="flex justify-between border-b border-base-300 pb-1">
							<span class="opacity-70">{m.inv_common_level()}:</span>
							<strong class="font-medium text-right">{detail.currentLevel}</strong>
						</div>
						<div class="flex justify-between border-b border-base-300 pb-1">
							<span class="opacity-70">{m.inv_common_store()}:</span>
							<strong class="font-medium text-right">{detail.storeName ?? '—'}</strong>
						</div>
						<div class="flex justify-between border-b border-base-300 pb-1">
							<span class="opacity-70">{m.inv_po_linked_pr()}</span>
							<strong class="font-medium text-right">
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
							<span class="opacity-70">{m.inv_po_select_supplier()}:</span>
							<strong class="font-medium text-right">{detail.supplierName ?? '—'}</strong>
						</div>
					</div>
				</div>
				<div class="flex flex-col justify-end space-y-4">
					<div class="p-4 bg-primary/10 rounded-lg text-primary text-right mb-2">
						<span class="opacity-80 text-xs uppercase font-semibold tracking-wider block mb-1"
							>{m.inv_po_line_unit_price()} Total</span
						>
						<span class="text-2xl font-bold">{detail.totalAmount}</span>
					</div>
					<div class="space-y-1">
						<DaisyUiLabel>{m.inv_common_remarks()}</DaisyUiLabel>
						<textarea
							class="textarea textarea-bordered w-full resize-none h-[88px]"
							bind:value={remarks}
							placeholder="Optional approval remarks..."
						></textarea>
					</div>
				</div>
			</div>

			{#if detail.statusTaggingId === InvPoStatusTaggingEnum.PENDING}
				<div class="mb-6 p-4 border border-base-200 rounded-lg bg-base-100/50">
					<div class="flex flex-wrap gap-2">
						<DaisyUiButton
							className="d-btn-primary"
							disabled={loading}
							onClick={() => act(InvApprovalActionEnum.APPROVED)}
						>
							{m.inv_btn_approve()}
						</DaisyUiButton>
						<DaisyUiButton
							className="d-btn-error d-btn-outline"
							disabled={loading}
							onClick={() => act(InvApprovalActionEnum.REJECTED)}
						>
							{m.inv_btn_reject()}
						</DaisyUiButton>
					</div>
				</div>
			{:else if detail.statusTaggingId === InvPoStatusTaggingEnum.REJECTED}
				<div class="mb-6">
					<DaisyUiButton
						className="d-btn-outline d-btn-primary"
						disabled={loading}
						onClick={() => resubmitPo()}
					>
						{m.inv_po_resubmit()}
					</DaisyUiButton>
				</div>
			{/if}

			<h2 class="font-semibold text-lg mb-3 mt-4 text-base-content/90">{m.inv_po_lines()}</h2>
			<div class={`${TableEnum.HEIGHT} min-w-0 mb-8`}>
				<MariTable
					columns={lineColumns}
					rows={detail.lines}
					isLoading={loading}
					showRowActions={true}
					actionsVariant="none"
					showRefreshButton={false}
					emptyMessage="No lines"
				>
					{#snippet rowActions(row)}
					<div class="flex flex-col items-center gap-1">
						{#if poAllowsLineClose && isLineClosable(row)}
							<DaisyUiTooltip tooltipText={m.inv_po_close_line()} className="d-tooltip-warning d-tooltip-right">
								<DaisyUiButton
									className="d-btn-sm d-btn-ghost d-btn-warning"
									disabled={loading}
									onClick={() => void closeLine(row.id)}
								>
									<LucideX className="size-5"/>
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
