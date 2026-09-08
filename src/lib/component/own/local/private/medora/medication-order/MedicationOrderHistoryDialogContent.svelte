<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideShoppingBasket from '$lib/component/own/library/lucide/LucideShoppingBasket.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { MedicationOrderBatchHistoryRow } from '$lib/model/type/medora/medication-order.type';
	import { medOrderBatchHistoryTableColumns } from '$lib/tool/medication-order/med-order-batch-history-table-columns.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';

	const lifeCycleUtil = new LifeCycleUtil();

	let {
		cancel,
		apiRoot,
		visitId,
		enableColumnFilters = true,
		onEdit,
		onReorder,
		onDelete
	}: DialogSlotProps & {
		apiRoot: string;
		visitId?: number;
		enableColumnFilters?: boolean;
		onEdit: (batchId: number) => void | Promise<void>;
		onReorder: (batchId: number) => void | Promise<boolean>;
		onDelete: (batchId: number) => void | Promise<boolean>;
	} = $props();

	let rows = $state<MedicationOrderBatchHistoryRow[]>([]);
	let storeNameById = $state<Record<number, string>>({});
	let currentPage = $state(1);
	let pageSizeStr = $state('10');
	let columnFilters = $state<Record<string, string>>({});
	let isLoading = $state(false);
	let isActing = $state(false);
	let pendingConfirm = $state<
		| null
		| { type: 'delete' | 'reorder'; batchId: number }
	>(null);

	const historyColumns = $derived.by(
		(): MenziesTableColumn<MedicationOrderBatchHistoryRow>[] =>
			medOrderBatchHistoryTableColumns(
				{
					batch: m.med_order_int_batch(),
					store: m.med_order_int_store(),
					visitNo: m.visit_history_visit_label_visit_no(),
					extCustomer: m.med_order_int_hist_ext_customer(),
					advisingDoctor: m.med_order_int_hist_advising_doctor(),
					lines: m.med_order_int_hist_lines(),
					createdAt: m.created_at(),
					updatedAt: m.updated_at(),
					createdBy: m.med_order_int_hist_created_by(),
					updatedBy: m.med_order_int_hist_updated_by(),
					notApplicable: m.med_order_int_not_applicable()
				},
				{ storeNameById }
			)
	);

	async function loadStoreNames() {
		const r = await fetch(`${apiRoot}?mode=stores.search`, {
			credentials: 'include'
		});
		if (!r.ok) return;
		const stores = (await r.json()) as {
			id: number;
			storeName: string | null;
		}[];
		const mp: Record<number, string> = {};
		for (const s of stores) mp[s.id] = s.storeName ?? `#${s.id}`;
		storeNameById = mp;
	}

	async function fetchHistory() {
		isLoading = true;
		try {
			const u = new URL(apiRoot, window.location.origin);
			u.searchParams.set('mode', 'batch.list');
			if (visitId != null && Number.isFinite(visitId) && visitId > 0) {
				u.searchParams.set('visitId', String(visitId));
			}
			const res = await fetch(u, { credentials: 'include' });
			if (!res.ok) {
				rows = [];
				return;
			}
			rows = (await res.json()) as MedicationOrderBatchHistoryRow[];
		} finally {
			isLoading = false;
		}
	}

	async function refresh() {
		currentPage = 1;
		await Promise.all([fetchHistory(), loadStoreNames()]);
	}

	lifeCycleUtil.onMount(() => {
		void refresh();
	});

	async function handleEdit(batchId: number) {
		if (isActing) return;
		isActing = true;
		try {
			await onEdit(batchId);
		} finally {
			isActing = false;
		}
	}

	function requestReorder(batchId: number) {
		if (busy) return;
		pendingConfirm = { type: 'reorder', batchId };
	}

	function requestDelete(batchId: number) {
		if (busy) return;
		pendingConfirm = { type: 'delete', batchId };
	}

	function dismissConfirm() {
		if (isActing) return;
		pendingConfirm = null;
	}

	async function confirmPendingAction() {
		if (!pendingConfirm || isActing) return;
		const { type, batchId } = pendingConfirm;
		isActing = true;
		try {
			if (type === 'reorder') {
				const shouldRefresh = await onReorder(batchId);
				if (shouldRefresh) await fetchHistory();
			} else {
				const deleted = await onDelete(batchId);
				if (deleted) await fetchHistory();
			}
			pendingConfirm = null;
		} finally {
			isActing = false;
		}
	}

	const busy = $derived(isLoading || isActing);
	const confirmMessage = $derived(
		pendingConfirm?.type === 'reorder'
			? m.med_order_int_reorder_append_confirm()
			: pendingConfirm?.type === 'delete'
				? m.med_order_int_delete_confirm()
				: ''
	);
	const confirmTitle = $derived(
		pendingConfirm?.type === 'reorder'
			? m.med_order_int_reorder_append_title()
			: pendingConfirm?.type === 'delete'
				? m.med_order_int_delete_title()
				: ''
	);
</script>

<div class="relative flex h-full min-h-0 flex-col gap-0 overflow-hidden">
	<div
		class="flex shrink-0 items-center justify-between border-b border-base-300 px-4 py-3"
	>
		<h2 class="text-lg font-semibold">{m.med_order_int_history()}</h2>
		<WashButton
			className="btn-ghost btn-sm btn-circle"
			onClick={cancel}
			disabled={busy}
		>
			<LucideX className="size-5" />
		</WashButton>
	</div>

	<div class="flex min-h-0 flex-1 flex-col px-4 py-2">
		<MenziesTable
			{rows}
			columns={historyColumns}
			bind:currentPage
			bind:pageSize={pageSizeStr}
			isLoading={busy}
			showRefreshButton={true}
			refreshTooltip={m.refresh_data()}
			emptyMessage={m.med_order_int_no_batches()}
			showRowActions={true}
			actionsHeader={m.actions()}
			actionsVariant="none"
			{enableColumnFilters}
			totalRowCount={rows.length}
			fillParent={true}
			bind:columnFilters
			on:refresh={() => void refresh()}
		>
			{#snippet rowActions(row, _localIdx)}
				<MenziesTableRowActionGroup>
					<MenziesTableIconAction
						tooltipText={m.med_order_int_tooltip_edit()}
						color="accent"
						disabled={busy}
						onClick={() =>
							void handleEdit(
								(row as MedicationOrderBatchHistoryRow).id
							)}
					>
						{#snippet icon()}
							<LucidePencil className="size-4" />
						{/snippet}
					</MenziesTableIconAction>
					<MenziesTableIconAction
						tooltipText={m.med_order_int_tooltip_reorder()}
						color="primary"
						disabled={busy}
						onClick={() =>
							requestReorder(
								(row as MedicationOrderBatchHistoryRow).id
							)}
					>
						{#snippet icon()}
							<LucideShoppingBasket className="size-4" />
						{/snippet}
					</MenziesTableIconAction>
					<MenziesTableIconAction
						tooltipText={m.med_order_int_tooltip_delete()}
						color="error"
						disabled={busy}
						onClick={() =>
							requestDelete(
								(row as MedicationOrderBatchHistoryRow).id
							)}
					>
						{#snippet icon()}
							<LucideTrash2 className="size-4" />
						{/snippet}
					</MenziesTableIconAction>
				</MenziesTableRowActionGroup>
			{/snippet}
		</MenziesTable>
	</div>

	{#if pendingConfirm}
		<div
			class="absolute inset-0 z-10 flex items-center justify-center bg-base-300/60 p-4"
			role="presentation"
		>
			<div
				class="modal-box flex w-full max-w-md flex-col gap-4 p-6 shadow-lg"
				role="alertdialog"
				aria-labelledby="med-order-history-confirm-title"
				aria-describedby="med-order-history-confirm-message"
			>
				<h3
					id="med-order-history-confirm-title"
					class="text-lg font-semibold"
				>
					{confirmTitle}
				</h3>
				<p
					id="med-order-history-confirm-message"
					class="text-sm text-base-content/80"
				>
					{confirmMessage}
				</p>
				<div class="flex flex-wrap justify-end gap-2">
					<WashButton
						className="btn-ghost"
						disabled={isActing}
						onClick={dismissConfirm}
					>
						{m.cancel()}
					</WashButton>
					<WashButton
						className="btn btn-primary"
						disabled={isActing}
						onClick={() => void confirmPendingAction()}
					>
						{m.ok()}
					</WashButton>
				</div>
			</div>
		</div>
	{/if}
</div>
