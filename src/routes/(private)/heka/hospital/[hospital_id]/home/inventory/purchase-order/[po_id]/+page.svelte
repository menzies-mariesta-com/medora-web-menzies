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
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
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

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);
	const poId = $derived(
		typeof page.params.po_id === 'string' ? page.params.po_id : ''
	);

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
		canApprove?: boolean;
		lines: PoLine[];
	};

	let detail = $state<PoDetail | null>(null);
	let detailLoading = $state(false);
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
				toastService.addToast('Action failed', StatusColorEnum.ERROR, t || String(res.status));
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
				toastService.addToast('Action failed', StatusColorEnum.ERROR, t || String(res.status));
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
				{m.inv_po_detail_title()}
			</DaisyUiCardBodyTitle>
		</div>
		{#if !poId}
			<p class="text-sm text-base-content/70">{m.inv_po_approve_need_poId()}</p>
		{:else if detailLoading && !detail}
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

			<h2 class="font-semibold text-lg mb-3 mt-4 text-base-content/90">{m.inv_po_lines()}</h2>
			<div class={`${TableEnum.HEIGHT} min-w-0 mb-8`}>
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
					<div class="flex flex-col items-center gap-1">
						{#if poAllowsLineClose && isLineClosable(row)}
							<DaisyUiTooltip tooltipText={m.inv_po_close_line()} className="d-tooltip-warning d-tooltip-right">
								<DaisyUiButton
									className="d-btn-sm d-btn-ghost d-btn-warning"
									disabled={detailLoading}
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
