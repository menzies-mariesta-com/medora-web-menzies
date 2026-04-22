<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import InventoryTableTextCell from '$lib/component/own/local/private/heka/inventory/InventoryTableTextCell.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { m } from '$lib/paraglide/messages';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import {
		InvApprovalActionEnum,
		InvPrStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';

	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);
	const prId = $derived(page.url.searchParams.get('prId') ?? '');

	type PrLine = {
		id: number;
		itemId: number;
		quantity: string;
		unitId: number;
		itemName?: string | null;
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
		storeId: number;
		storeName?: string | null;
		statusTaggingId: number;
		statusName?: string | null;
		currentLevel: number;
		remarks: string | null;
		lines: PrLine[];
		logs: LogRow[];
	};

	let detail = $state<PrDetail | null>(null);
	let loading = $state(false);
	let remarks = $state('');
	let lineQtyDraft = $state<Record<number, string>>({});
	let baselineQty = $state<Record<number, string>>({});

	function actionLabel(a: number): string {
		if (a === InvApprovalActionEnum.APPROVED) return m.inv_approval_action_approved();
		if (a === InvApprovalActionEnum.REJECTED) return m.inv_approval_action_rejected();
		if (a === InvApprovalActionEnum.SENT_BACK) return m.inv_approval_action_sent_back();
		return String(a);
	}

	function syncLineDrafts(d: PrDetail) {
		const next: Record<number, string> = {};
		const base: Record<number, string> = {};
		for (const ln of d.lines) {
			const q = String(ln.quantity);
			next[ln.id] = q;
			base[ln.id] = q;
		}
		lineQtyDraft = next;
		baselineQty = base;
	}

	async function load() {
		if (!hospitalId || !prId) return;
		loading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition?id=${encodeURIComponent(prId)}`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as PrDetail | null;
			detail = j;
			if (j) syncLineDrafts(j);
		} catch (e) {
			toastService.addErrorToast('Could not load purchase requisition', e);
		} finally {
			loading = false;
		}
	}

	function buildLineAdjustments(): { lineId: number; quantity: string }[] | undefined {
		if (!detail) return undefined;
		const adj: { lineId: number; quantity: string }[] = [];
		for (const ln of detail.lines) {
			const draft = (lineQtyDraft[ln.id] ?? '').trim();
			const orig = baselineQty[ln.id] ?? String(ln.quantity);
			if (draft && draft !== orig) {
				adj.push({ lineId: ln.id, quantity: draft });
			}
		}
		return adj.length ? adj : undefined;
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
				toastService.addToast('Action failed', StatusColorEnum.ERROR, t || String(res.status));
				return;
			}
			const j = (await res.json()) as PrDetail;
			detail = j;
			syncLineDrafts(j);
			remarks = '';
		} catch (e) {
			toastService.addErrorToast('Action failed', e);
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
				toastService.addToast('Action failed', StatusColorEnum.ERROR, t || String(res.status));
				return;
			}
			const j = (await res.json()) as PrDetail;
			detail = j;
			syncLineDrafts(j);
		} catch (e) {
			toastService.addErrorToast('Action failed', e);
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
		const pending = detail?.statusTaggingId === InvPrStatusTaggingEnum.PENDING;
		const qtyCol: MariTableColumn<PrLine> = pending
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
					format: (_v, row) => row.quantity
				};
		return [
			{
				id: 'itemName',
				header: m.inv_common_item(),
				field: 'itemName',
				format: (_v, row) => row.itemName ?? '—'
			},
			qtyCol
		];
	});

	const logColumns: MariTableColumn<LogRow>[] = [
		{
			id: 'createdAt',
			header: m.inv_pr_approve_log_at(),
			field: 'createdAt',
			widthClass: 'w-40',
			format: (v) => String(v ?? '')
		},
		{
			id: 'level',
			header: m.inv_pr_approve_log_level(),
			field: 'level',
			widthClass: 'w-24',
			format: (_v, row) => String(row.level)
		},
		{
			id: 'action',
			header: m.inv_pr_approve_log_action(),
			field: 'action',
			widthClass: 'w-32',
			format: (_v, row) => actionLabel(row.action)
		},
		{
			id: 'remarks',
			header: m.inv_common_remarks(),
			field: 'remarks',
			format: (_v, row) => row.remarks ?? '—'
		},
		{
			id: 'by',
			header: m.inv_pr_approve_log_by(),
			field: 'approvedByName',
			widthClass: TableRowEnum.FULL_NAME_COLUMN_WIDTH,
			format: (_v, row) => row.approvedByName ?? row.approvedBy ?? '—'
		}
	];
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<DaisyUiCardBodyTitle className="mb-4">
			{m.inv_page_pr_approve_title()}
		</DaisyUiCardBodyTitle>
		{#if !prId}
			<p class="text-sm text-base-content/70">{m.inv_pr_approve_need_prId()}</p>
		{:else if loading && !detail}
			<p class="text-sm text-base-content/70">{m.loading()}</p>
		{:else if detail}
			<div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="space-y-2 text-sm bg-base-200 p-4 rounded-lg">
					<div class="flex flex-col gap-1">
						<div class="flex justify-between border-b border-base-300 pb-1">
							<span class="opacity-70">{m.inv_common_store()}:</span>
							<strong class="font-medium text-right">{detail.storeName ?? '—'}</strong>
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
						<DaisyUiButton
							className="d-btn-warning d-btn-outline"
							disabled={loading}
							onClick={() => act(InvApprovalActionEnum.SENT_BACK)}
						>
							{m.inv_btn_send_back()}
						</DaisyUiButton>
					</div>
				</div>
			{:else if detail.statusTaggingId === InvPrStatusTaggingEnum.REJECTED || detail.statusTaggingId === InvPrStatusTaggingEnum.SENT_BACK}
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

			<h2 class="font-semibold text-lg mb-3 mt-4 text-base-content/90">{m.inv_pr_approve_lines()}</h2>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					columns={lineColumns}
					rows={detail.lines}
					isLoading={false}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					on:refresh={() => load()}
					emptyMessage="No lines"
				/>
			</div>

			<h2 class="font-semibold text-lg mb-3 mt-4 text-base-content/90">{m.inv_pr_approve_logs()}</h2>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					columns={logColumns}
					rows={detail.logs}
					isLoading={false}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					on:refresh={() => load()}
					emptyMessage="No logs found"
				/>
			</div>
		{/if}
	</DaisyUiCardBody>
</DaisyUiCard>
