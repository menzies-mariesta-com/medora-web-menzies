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
	import { toastError, toastLine } from '$lib/util/toast-copy.util';
	import {
		InvApprovalActionEnum,
		InvPrStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		formatPurchaseQtyCellWithIssueEquivalent,
		itemUnitMastersResponseToCatalog
	} from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);
	const prId = $derived(page.url.searchParams.get('prId') ?? '');

	const prListPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/purchase-requisition' as any)
	);

	type PrLine = {
		id: number;
		itemId: number;
		quantity: string;
		unitId: number;
		itemName?: string | null;
		qtyRemaining?: string | null;
		itemUnitMasterId?: number | null;
		itemUnitMasterConversion?: string | null;
		pendingPrPurchaseQty?: string | null;
		pendingPoPurchaseQty?: string | null;
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

	type PrDetail = {
		id: string;
		fromStoreId: number;
		toStoreId: number;
		fromStoreName?: string | null;
		toStoreName?: string | null;
		statusTaggingId: number;
		statusName?: string | null;
		currentLevel: number;
		remarks: string | null;
		lines: PrLine[];
	};

	let detail = $state<PrDetail | null>(null);
	let loading = $state(false);
	let remarks = $state('');
	/** Editable approved quantity per line when PR is pending (defaults to requested). */
	let lineApprovedQtyDraft = $state<Record<number, string>>({});
	let iumCatalogById = $state(new Map());

	function actionLabel(a: number): string {
		if (a === InvApprovalActionEnum.APPROVED) return m.inv_approval_action_approved();
		if (a === InvApprovalActionEnum.REJECTED) return m.inv_approval_action_rejected();
		return String(a);
	}

	function syncApprovedDrafts(d: PrDetail) {
		const next: Record<number, string> = {};
		for (const ln of d.lines) {
			next[ln.id] = String(ln.quantity);
		}
		lineApprovedQtyDraft = next;
	}

	async function load() {
		if (!hospitalId || !prId) return;
		loading = true;
		try {
			const [res, iumRes] = await Promise.all([
				fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition?id=${encodeURIComponent(prId)}`,
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
			const j = (await res.json()) as PrDetail | null;
			detail = j;
			if (j) syncApprovedDrafts(j);
		} catch (e) {
		toastError(
			toastService,
			m.entity_purchase_requisition(),
			m.toast_action_loaded_failed(),
			e
		);
		} finally {
			loading = false;
		}
	}

	function buildLineAdjustments(): { lineId: number; quantity: string }[] | undefined {
		if (!detail) return undefined;
		const adj: { lineId: number; quantity: string }[] = [];
		for (const ln of detail.lines) {
			const requested = String(ln.quantity).trim();
			const approved = (lineApprovedQtyDraft[ln.id] ?? '').trim();
			if (approved && approved !== requested) {
				adj.push({ lineId: ln.id, quantity: approved });
			}
		}
		return adj.length ? adj : undefined;
	}

	function prAllowsLineClose(): boolean {
		if (!detail) return false;
		// Demand close is not allowed for cancelled PR.
		return detail.statusTaggingId !== InvPrStatusTaggingEnum.CANCELLED;
	}

	function isLineClosable(line: PrLine): boolean {
		const rem = Number(line.qtyRemaining);
		if (!Number.isFinite(rem)) return false;
		return rem > 0;
	}

	async function closeLine(lineId: number) {
		if (!hospitalId || !prId) return;
		if (!confirm(m.inv_pr_close_line_confirm())) return;
		loading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition/close-line`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prId, lineId })
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
			const j = (await res.json()) as PrDetail;
			detail = j;
			syncApprovedDrafts(j);
			toastService.addSuccessToast(m.inv_pr_close_line_success());
		} catch (e) {
			toastService.addErrorToast('Action failed', e);
		} finally {
			loading = false;
		}
	}

	async function act(action: number) {
		if (!hospitalId || !prId) return;
		loading = true;
		try {
			const lineAdjustments =
				action === InvApprovalActionEnum.APPROVED ? buildLineAdjustments() : undefined;
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition/approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						prId,
						action,
						remarks: remarks.trim() || null,
						...(lineAdjustments ? { lineAdjustments } : {})
					})
				}
			);
			if (!res.ok) {
				const t = await res.text();
				toastService.addToast(
					toastLine(
						m.entity_purchase_requisition(),
						m.toast_action_failed()
					),
					StatusColorEnum.ERROR,
					t || String(res.status)
				);
				return;
			}
			const j = (await res.json()) as PrDetail;
			detail = j;
			syncApprovedDrafts(j);
			remarks = '';
		} catch (e) {
			toastError(
				toastService,
				m.entity_purchase_requisition(),
				m.toast_action_failed(),
				e
			);
		} finally {
			loading = false;
		}
	}

	async function resubmit() {
		if (!hospitalId || !prId) return;
		loading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition/resubmit`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prId })
				}
			);
			if (!res.ok) {
				const t = await res.text();
				toastService.addToast(
					toastLine(
						m.entity_purchase_requisition(),
						m.toast_action_failed()
					),
					StatusColorEnum.ERROR,
					t || String(res.status)
				);
				return;
			}
			const j = (await res.json()) as PrDetail;
			detail = j;
			syncApprovedDrafts(j);
		} catch (e) {
			toastError(
				toastService,
				m.entity_purchase_requisition(),
				m.toast_action_failed(),
				e
			);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void prId;
		void hospitalId;
		void load();
	});

	const lineColumns = $derived.by((): MariTableColumn<PrLine>[] => {
		const cat = iumCatalogById;
		const pending = detail?.statusTaggingId === InvPrStatusTaggingEnum.PENDING;
		const requestedCol: MariTableColumn<PrLine> = {
			id: 'requestedQty',
			header: m.inv_pr_line_requested_qty(),
			field: 'quantity',
			widthClass: 'w-32',
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
		const pendingPrCol: MariTableColumn<PrLine> = {
			id: 'pendingPrPurchaseQty',
			header: m.inv_pr_line_metric_pending_pr_qty(),
			field: 'pendingPrPurchaseQty',
			widthClass: 'w-36',
			format: (_v, row) => {
				const raw = row.pendingPrPurchaseQty;
				if (raw == null || String(raw).trim() === '') return '—';
				return formatPurchaseQtyCellWithIssueEquivalent(
					{
						quantity: String(raw).trim(),
						itemUnitMasterId: row.itemUnitMasterId,
						iumList: []
					},
					cat
				);
			}
		};
		const pendingPoCol: MariTableColumn<PrLine> = {
			id: 'pendingPoPurchaseQty',
			header: m.inv_po_line_metric_pending_po_qty(),
			field: 'pendingPoPurchaseQty',
			widthClass: 'w-36',
			format: (_v, row) => {
				const raw = row.pendingPoPurchaseQty;
				if (raw == null || String(raw).trim() === '') return '—';
				return formatPurchaseQtyCellWithIssueEquivalent(
					{
						quantity: String(raw).trim(),
						itemUnitMasterId: row.itemUnitMasterId,
						iumList: []
					},
					cat
				);
			}
		};
		const approvedCol: MariTableColumn<PrLine> = pending
			? {
					id: 'approvedQty',
					header: m.inv_pr_approve_approved_qty(),
					field: 'quantity',
					widthClass: 'w-36',
					cellComponentGetter: (row) => ({
						component: InventoryTableTextCell,
						props: {
							value:
								lineApprovedQtyDraft[row.id] ?? String(row.quantity),
							onValueChange: (v: string) => {
								lineApprovedQtyDraft[row.id] = v;
								lineApprovedQtyDraft = { ...lineApprovedQtyDraft };
							}
						}
					})
				}
			: {
					id: 'approvedQty',
					header: m.inv_pr_approve_approved_qty(),
					field: 'quantity',
					widthClass: 'w-36',
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
		return [
			{
				id: 'itemName',
				header: m.inv_common_item(),
				field: 'itemName',
				format: (_v, row) => row.itemName ?? '—'
			},
			{
				id: 'conversion',
				header: m.inv_pr_line_select_conversion(),
				field: 'itemUnitMasterConversion',
				widthClass: 'min-w-[10rem]',
				format: (_v, row) => row.itemUnitMasterConversion?.trim() || '—'
			},
			requestedCol,
			pendingPrCol,
			pendingPoCol,
			approvedCol,
			{
				id: 'qtyRemaining',
				header: m.inv_pr_line_open_for_po(),
				field: 'qtyRemaining',
				widthClass: 'w-36',
				format: (_v, row) => {
					const q = row.qtyRemaining;
					if (q == null || String(q).trim() === '') return '—';
					return formatPurchaseQtyCellWithIssueEquivalent(
						{
							quantity: String(q).trim(),
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
		<div class="mb-4 flex items-center gap-2">
			<DaisyUiTooltip
				tooltipText={m.inv_common_back_to_list()}
				className="d-tooltip-ghost d-tooltip-right"
			>
				<DaisyUiButton
					type="button"
					className="d-btn-sm d-btn-ghost d-btn-square"
					onClick={() => void goto(resolve(prListPath as any))}
				>
					<LucideArrowLeft className="size-4" />
				</DaisyUiButton>
			</DaisyUiTooltip>
			<DaisyUiCardBodyTitle className="mb-0">
				{m.inv_page_pr_approve_title()}
			</DaisyUiCardBodyTitle>
		</div>
		{#if !prId}
			<p class="text-sm text-base-content/70">{m.inv_pr_approve_need_prId()}</p>
		{:else if loading && !detail}
			<p class="text-sm text-base-content/70">{m.loading()}</p>
		{:else if detail}
			<div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2 text-sm bg-base-200 p-4 rounded-lg">
					<div class="flex flex-col gap-1">
						<div class="flex justify-between border-b border-base-300 pb-1">
							<span class="opacity-70">From store:</span>
							<strong class="font-medium text-right">{detail.fromStoreName ?? '—'}</strong>
						</div>
						<div class="flex justify-between border-b border-base-300 pb-1">
							<span class="opacity-70">To store:</span>
							<strong class="font-medium text-right">{detail.toStoreName ?? '—'}</strong>
						</div>
						<div class="flex justify-between border-b border-base-300 pb-1">
							<span class="opacity-70">{m.status()}:</span>
							<strong class="font-medium text-right text-primary">{detail.statusName ?? '—'}</strong>
						</div>
						<div class="flex justify-between pb-1">
							<span class="opacity-70">{m.inv_common_level()}:</span>
							<strong class="font-medium text-right">{detail.currentLevel}</strong>
						</div>
					</div>
					{#if detail.remarks}
						<div class="mt-3 bg-base-100 p-2 rounded text-xs">
							<span class="opacity-70">{m.inv_common_remarks()}:</span>
							{detail.remarks}
						</div>
					{/if}
				</div>
				<div class="space-y-4 flex flex-col justify-end">
					<DaisyUiLabel>{m.inv_common_remarks()}</DaisyUiLabel>
					<textarea
						class="textarea textarea-bordered w-full resize-none h-[88px]"
						bind:value={remarks}
						placeholder="Optional approval remarks..."
					></textarea>
				</div>
			</div>

			{#if detail.statusTaggingId === InvPrStatusTaggingEnum.PENDING}
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
			{:else if detail.statusTaggingId === InvPrStatusTaggingEnum.REJECTED}
				<div class="mb-6">
					<DaisyUiButton
						className="d-btn-outline d-btn-primary"
						disabled={loading}
						onClick={() => resubmit()}
					>
						{m.inv_pr_resubmit()}
					</DaisyUiButton>
				</div>
			{/if}

			<div class="mt-4 mb-3 space-y-1">
				<h2 class="font-semibold text-lg text-base-content/90">{m.inv_pr_approve_lines()}</h2>
			</div>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					columns={lineColumns}
					rows={detail.lines}
					isLoading={loading}
					showRowActions={true}
					actionsVariant="none"
					showRefreshButton={false}
					emptyMessage={m.inv_pr_approve_lines_empty()}
				>
					{#snippet rowActions(row)}
					<div class="flex flex-col items-center gap-1">
						{#if prAllowsLineClose() && isLineClosable(row)}
							<DaisyUiTooltip tooltipText={m.inv_pr_close_line()} className="d-tooltip-warning d-tooltip-right">
								<DaisyUiButton
									className="d-btn-sm d-btn-ghost d-btn-warning"
									disabled={loading}
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
