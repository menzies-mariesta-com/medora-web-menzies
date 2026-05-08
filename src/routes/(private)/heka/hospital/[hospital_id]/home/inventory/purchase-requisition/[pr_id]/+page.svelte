<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import PrLineItemsCard from '$lib/component/own/local/private/heka/inventory/purchase-requisition/PrLineItemsCard.svelte';
	import { m } from '$lib/paraglide/messages';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { InvPrStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { formatPurchaseQtyCellWithIssueEquivalent } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	const prId = $derived(
		typeof page.params.pr_id === 'string' ? page.params.pr_id : ''
	);

	const toastService = new ToastService();

	type IumOpt = {
		id: number;
		conversionDisplay: string;
		purchaseUnitId: number;
		issueUnitId: number;
		purchaseConversionFactor?: string;
		issueConversionFactor?: string;
		issueUnitName?: string;
	};

	type PrLineForm = {
		key: string;
		itemSearch: string;
		hits: { id: number; itemName: string | null }[];
		itemId: number | null;
		itemLabel: string;
		quantity: string;
		iumList: IumOpt[];
		itemUnitMasterId: number | null;
		prLineId?: string | null;
		qtyRemainingOnPr?: string | null;
		pendingPrPurchaseQty?: string | null;
		pendingPoPurchaseQty?: string | null;
	};

	type PrDetailApi = {
		id?: string;
		prNo?: string | null;
		statusName?: string | null;
		statusCode?: string | null;
		statusTaggingId?: number;
		fromStoreId: number;
		toStoreId: number;
		remarks: string | null;
		poCount?: number;
		canApprove?: boolean;
		linkedPurchaseOrders?: { id: string; poNo: string | null }[];
		lines: {
			id: number;
			itemId: number;
			quantity: string;
			unitId: number;
			qtyRemaining?: string | null;
			itemName?: string | null;
			pendingPrPurchaseQty?: string | null;
			pendingPoPurchaseQty?: string | null;
		}[];
	};

	let stores = $state<{ id: number; storeName: string | null }[]>([]);
	let createFromStoreId = $state<number | null>(null);
	let createToStoreId = $state<number | null>(null);
	let createRemarks = $state('');

	let headerPrNo = $state<string | null>(null);
	let headerStatusLabel = $state<string>('—');
	let headerStatusCode = $state<string | null>(null);
	let detailStatusTaggingId = $state<number | null>(null);
	let detailCanApprove = $state(false);

	let createLines = $state<PrLineForm[]>([]);
	let lineItemFilter = $state('');

	let linkedPurchaseOrders = $state<{ id: string; poNo: string | null }[]>([]);
	let prDetailPoCount = $state(0);

	let detailLoading = $state(true);

	let storesAbort: AbortController | null = null;
	let lastLoadedKey = $state<string | null>(null);

	const fromStoreNavLabel = $derived.by(() => {
		const id = createFromStoreId;
		if (id == null) return '—';
		const match = stores.find((s) => s.id === id);
		if (match?.storeName?.trim()) return match.storeName.trim();
		return '—';
	});

	const prListPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/purchase-requisition' as any)
	);

	function prRowCanEdit(statusTaggingId: number | null): boolean {
		if (statusTaggingId == null) return false;
		return (
			statusTaggingId === InvPrStatusTaggingEnum.DRAFT ||
			statusTaggingId === InvPrStatusTaggingEnum.PENDING ||
			statusTaggingId === InvPrStatusTaggingEnum.SENT_BACK ||
			statusTaggingId === InvPrStatusTaggingEnum.REJECTED
		);
	}

	function newLine(): PrLineForm {
		return {
			key: crypto.randomUUID(),
			itemSearch: '',
			hits: [],
			itemId: null,
			itemLabel: '',
			quantity: '1',
			iumList: [],
			itemUnitMasterId: null
		};
	}

	function conversionLabelForLine(line: PrLineForm): string {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.conversionDisplay ?? '—';
	}

	async function loadStores() {
		if (!hospitalId) return;
		storesAbort?.abort();
		storesAbort = new AbortController();
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/approval-config?mode=stores`,
			{ method: 'GET', signal: storesAbort.signal }
		);
		stores = (await res.json()) as typeof stores;
	}

	async function hydrateLineItemMeta(line: PrLineForm, itemId: number) {
		if (!hospitalId) return;
		line.itemId = itemId;
		const [detailRes, iumRes] = await Promise.all([
			fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?id=${itemId}`,
				{ method: 'GET' }
			),
			fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?mode=itemUnitMasters`,
				{ method: 'GET' }
			)
		]);
		const detail = (await detailRes.json()) as {
			itemName?: string | null;
			itemUnitMasterIds?: number[];
			defaultItemUnitMasterId?: number | null;
		};
		const itemLabel = detail.itemName ?? '—';
		line.itemLabel = itemLabel;
		line.itemSearch = itemLabel;
		const allIum = (await iumRes.json()) as IumOpt[];
		const allowed = new Set(detail.itemUnitMasterIds ?? []);
		line.iumList = allIum.filter((u) => allowed.has(u.id));
		const def = detail.defaultItemUnitMasterId;
		line.itemUnitMasterId =
			def != null && line.iumList.some((u) => u.id === def)
				? def
				: (line.iumList[0]?.id ?? null);
	}

	async function hydrateLineFromPrDetail(
		line: PrLineForm,
		apiLine: PrDetailApi['lines'][number]
	) {
		line.quantity = String(apiLine.quantity ?? '0');
		line.prLineId = apiLine.id != null ? String(apiLine.id) : null;
		line.qtyRemainingOnPr =
			apiLine.qtyRemaining != null && String(apiLine.qtyRemaining).trim() !== ''
				? String(apiLine.qtyRemaining)
				: null;
		await hydrateLineItemMeta(line, apiLine.itemId);
		if (apiLine.itemName) {
			line.itemLabel = apiLine.itemName;
			line.itemSearch = apiLine.itemName;
		}
		const match = line.iumList.find((u) => u.purchaseUnitId === apiLine.unitId);
		if (match) line.itemUnitMasterId = match.id;
		line.pendingPrPurchaseQty =
			apiLine.pendingPrPurchaseQty != null &&
			String(apiLine.pendingPrPurchaseQty).trim() !== ''
				? String(apiLine.pendingPrPurchaseQty).trim()
				: null;
		line.pendingPoPurchaseQty =
			apiLine.pendingPoPurchaseQty != null &&
			String(apiLine.pendingPoPurchaseQty).trim() !== ''
				? String(apiLine.pendingPoPurchaseQty).trim()
				: null;
	}

	async function populateFromDetail(detail: PrDetailApi) {
		headerPrNo = detail.prNo ?? null;
		headerStatusLabel =
			detail.statusName ?? detail.statusCode ?? '—';
		headerStatusCode = detail.statusCode ?? null;
		detailStatusTaggingId = detail.statusTaggingId ?? null;
		detailCanApprove = Boolean(detail.canApprove);
		createFromStoreId = detail.fromStoreId;
		createToStoreId = detail.toStoreId;
		createRemarks = detail.remarks ?? '';
		linkedPurchaseOrders = detail.linkedPurchaseOrders ?? [];
		prDetailPoCount = detail.poCount ?? 0;
		const nextLines: PrLineForm[] = [];
		for (const l of detail.lines ?? []) {
			const line = newLine();
			await hydrateLineFromPrDetail(line, l);
			nextLines.push(line);
		}
		createLines = nextLines;
	}

	async function loadPrDetail() {
		if (!hospitalId || !prId) return;
		detailLoading = true;
		try {
			await loadStores();
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition?id=${encodeURIComponent(prId)}`,
				{ method: 'GET' }
			);
			if (!res.ok) {
				toastService.addToast(
					'View PR',
					StatusColorEnum.ERROR,
					await res.text().catch(() => String(res.status))
				);
				await goto(resolve(prListPath as any));
				return;
			}
			const detail = (await res.json()) as PrDetailApi | null;
			if (!detail) {
				await goto(resolve(prListPath as any));
				return;
			}
			await populateFromDetail(detail);
		} catch (e) {
			toastService.addErrorToast('View PR', e);
			await goto(resolve(prListPath as any));
		} finally {
			detailLoading = false;
		}
	}

	$effect(() => {
		const key = hospitalId && prId ? `${hospitalId}:${prId}` : '';
		if (!key) return;
		if (lastLoadedKey === key) return;
		lastLoadedKey = key;
		void loadPrDetail();
	});

	const lineColumns = $derived.by((): MariTableColumn<PrLineForm>[] => [
		{
			id: 'itemLabel',
			header: m.inv_common_item(),
			field: 'itemLabel',
			filterable: false,
			format: (_v, row) => row.itemLabel || '—'
		},
		{
			id: 'conversion',
			header: m.inv_common_unit(),
			field: 'itemUnitMasterId',
			filterable: false,
			format: (_v, row) => conversionLabelForLine(row)
		},
		{
			id: 'quantity',
			header: m.inv_pr_line_requested_qty(),
			field: 'quantity',
			filterable: false,
			format: (_v, row) => formatPurchaseQtyCellWithIssueEquivalent(row)
		},
		{
			id: 'pendingPrPurchaseQty',
			header: m.inv_pr_line_metric_pending_pr_qty(),
			field: 'pendingPrPurchaseQty',
			filterable: false,
			widthClass: 'min-w-[7rem]',
			format: (_v, row) => {
				const raw = row.pendingPrPurchaseQty?.trim();
				if (!raw) return '—';
				return formatPurchaseQtyCellWithIssueEquivalent({
					quantity: raw,
					itemUnitMasterId: row.itemUnitMasterId,
					iumList: row.iumList
				});
			}
		},
		{
			id: 'pendingPoPurchaseQty',
			header: m.inv_po_line_metric_pending_po_qty(),
			field: 'pendingPoPurchaseQty',
			filterable: false,
			widthClass: 'min-w-[7rem]',
			format: (_v, row) => {
				const raw = row.pendingPoPurchaseQty?.trim();
				if (!raw) return '—';
				return formatPurchaseQtyCellWithIssueEquivalent({
					quantity: raw,
					itemUnitMasterId: row.itemUnitMasterId,
					iumList: row.iumList
				});
			}
		},
		{
			id: 'qtyRemainingOnPr',
			header: m.inv_pr_line_open_for_po(),
			field: 'qtyRemainingOnPr',
			filterable: false,
			widthClass: 'min-w-[7rem]',
			format: (_v, row) => {
				const raw = row.qtyRemainingOnPr?.trim();
				if (!raw) return '—';
				return formatPurchaseQtyCellWithIssueEquivalent({
					quantity: raw,
					itemUnitMasterId: row.itemUnitMasterId,
					iumList: row.iumList
				});
			}
		}
	]);

	const filteredLines = $derived.by(() => {
		const q = lineItemFilter.trim().toLowerCase();
		if (!q) return createLines;
		return createLines.filter((l) => {
			const item = (l.itemLabel ?? '').toLowerCase();
			const conv = conversionLabelForLine(l).toLowerCase();
			const qty = (l.quantity ?? '').toLowerCase();
			const rem = (l.qtyRemainingOnPr ?? '').toLowerCase();
			const ppr = (l.pendingPrPurchaseQty ?? '').toLowerCase();
			const ppo = (l.pendingPoPurchaseQty ?? '').toLowerCase();
			return (
				item.includes(q) ||
				conv.includes(q) ||
				qty.includes(q) ||
				rem.includes(q) ||
				ppr.includes(q) ||
				ppo.includes(q)
			);
		});
	});

	function noopAdd() {}
	function noopEdit(_row: PrLineForm) {}
	function noopDelete(_key: string) {}

	function prAllowsLineClose(): boolean {
		if (detailStatusTaggingId == null) return false;
		return detailStatusTaggingId !== InvPrStatusTaggingEnum.CANCELLED;
	}

	function isCloseableLine(row: PrLineForm): boolean {
		const rem = Number(row.qtyRemainingOnPr);
		if (!Number.isFinite(rem)) return false;
		return rem > 0;
	}

	async function closeLine(row: PrLineForm) {
		if (!hospitalId || !prId) return;
		if (!confirm(m.inv_pr_close_line_confirm())) return;
		try {
			const lineId = row.prLineId ? Number(row.prLineId) : NaN;
			if (!Number.isFinite(lineId) || lineId <= 0) return;
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition/close-line`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prId, lineId })
				}
			);
			if (!res.ok) {
				toastService.addToast(
					'Action failed',
					StatusColorEnum.ERROR,
					await res.text().catch(() => String(res.status))
				);
				return;
			}
			const detail = (await res.json()) as PrDetailApi;
			await populateFromDetail(detail);
			toastService.addSuccessToast(m.inv_pr_close_line_success());
		} catch (e) {
			toastService.addErrorToast('Action failed', e);
		}
	}
</script>

<div class="space-y-5" aria-busy={detailLoading}>
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<DaisyUiTooltip
					tooltipText={m.inv_common_back_to_list()}
					className="d-tooltip-ghost d-tooltip-right"
				>
					<DaisyUiButton
						type="button"
						className="d-btn-sm d-btn-ghost d-btn-square"
						disabled={detailLoading}
						onClick={() => void goto(resolve(prListPath as any))}
					>
						<LucideArrowLeft className="size-4" />
					</DaisyUiButton>
				</DaisyUiTooltip>
				<h2 class="text-lg font-semibold">View purchase requisition</h2>
				{#if detailLoading}
					<span class="d-loading d-loading-spinner d-loading-sm text-base-content/50"></span>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
			<span
				class="d-badge d-badge-outline"
				title={headerStatusCode ?? undefined}
				aria-label={`Status: ${headerStatusLabel}`}
			>
				{headerStatusLabel}
			</span>
			{#if headerPrNo}
				<span class="d-badge d-badge-ghost" aria-label={`PR No: ${headerPrNo}`}>
					{m.inv_pr_no()}: {headerPrNo}
				</span>
			{:else}
				<span class="d-badge d-badge-ghost" aria-label="PR No">PR No: —</span>
			{/if}

		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<DaisyUiCard>
			<DaisyUiCardBody className="gap-3">
				<DaisyUiCardBodyTitle className="text-base">Store selection</DaisyUiCardBodyTitle>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div class="flex min-w-0 flex-col gap-2">
						<DaisyUiLabel className="text-xs opacity-80">{m.inv_nav_from_store()}</DaisyUiLabel>
						<input
							type="text"
							readonly
							disabled
							class="d-input d-input-bordered w-full text-sm"
							value={fromStoreNavLabel}
							aria-label={m.inv_nav_from_store()}
						/>
					</div>
					<div class="flex min-w-0 flex-col gap-2">
						<DaisyUiLabel className="text-xs opacity-80">{m.inv_transfer_to_store()}</DaisyUiLabel>
						<div class="rounded-box border border-base-200 bg-base-200/30 px-3 py-2 text-sm">
							{stores.find((s) => s.id === createToStoreId)?.storeName?.trim() ?? '—'}
						</div>
					</div>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>

		<DaisyUiCard>
			<DaisyUiCardBody className="gap-3">
				<DaisyUiCardBodyTitle className="text-base">Requisition Remarks</DaisyUiCardBodyTitle>
				<div class="flex min-w-0 flex-col gap-2">
					<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_remarks()}</DaisyUiLabel>
					<textarea
						class="d-textarea d-textarea-bordered w-full opacity-80"
						value={createRemarks}
						readonly
						rows="3"
						aria-label={m.inv_common_remarks()}
					></textarea>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>
	</div>

		{#if linkedPurchaseOrders.length > 0 || (prDetailPoCount ?? 0) > 0}
			<DaisyUiCard>
				<DaisyUiCardBody className="gap-3">
					<DaisyUiCardBodyTitle className="text-base">{m.inv_pr_trace_title()}</DaisyUiCardBodyTitle>
					{#if linkedPurchaseOrders.length > 0}
						<ul class="flex flex-wrap gap-2">
							{#each linkedPurchaseOrders as po (po.id)}
								<li>
									<span class="text-sm font-medium">
										{po.poNo?.trim() ? po.poNo : po.id}
									</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-sm text-warning">{m.inv_pr_trace_po_mismatch()}</p>
					{/if}
				</DaisyUiCardBody>
			</DaisyUiCard>
		{/if}

		<PrLineItemsCard
			viewOnly={true}
			bind:lineItemFilter
			createLinesCount={createLines.length}
			columns={lineColumns}
			rows={filteredLines}
			onAddItem={noopAdd}
			onEditLine={noopEdit}
			onDeleteLine={noopDelete}
			showCloseLine={prAllowsLineClose()}
			isCloseableFn={(row) => isCloseableLine(row)}
			onCloseLine={(row) => void closeLine(row)}
		/>
	</div>
