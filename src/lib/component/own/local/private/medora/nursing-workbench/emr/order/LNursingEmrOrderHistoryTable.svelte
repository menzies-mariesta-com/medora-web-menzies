<script lang="ts">
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import { m } from '$lib/paraglide/messages';
	import MenziesTable from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { ServiceOrderDetailListRow } from '$lib/model/type/medora/ui-rows.type';
	import { serviceOrderHistoryDetailColumns } from '$lib/tool/order/service-order-history-detail-columns.util';

	export type NursingEmrOrderHistoryItem = ServiceOrderDetailListRow & {
		orderNo: string | null;
		advisingDoctorName: string | null;
		serviceName: string;
		categoryName: string;
		subCategoryName: string;
	};

	export const NURSING_EMR_ORDER_HISTORY_TITLE =
		'Order history (this visit)';

	let {
		items,
		isLoading,
		pageSizeStr = $bindable(`${10}`),
		currentPage = $bindable(1),
		columnFilters = $bindable<Record<string, string>>({}),
		onFiltersChange,
		onDelete,
		onAdd,
		onRefresh,
		addLabel = '',
		embedded = false,
		fillParent = false,
		wrapperClass = TableEnum.HEIGHT
	}: {
		items: NursingEmrOrderHistoryItem[];
		isLoading: boolean;
		pageSizeStr?: string;
		currentPage?: number;
		columnFilters?: Record<string, string>;
		onFiltersChange?: (filters: Record<string, string>) => void;
		onDelete: (row: NursingEmrOrderHistoryItem) => void;
		onAdd?: () => void;
		onRefresh?: () => void;
		addLabel?: string;
		embedded?: boolean;
		fillParent?: boolean;
		wrapperClass?: string;
	} = $props();

	const columns = serviceOrderHistoryDetailColumns<NursingEmrOrderHistoryItem>();
</script>

<div
	class="flex min-h-0 flex-col {wrapperClass}"
	class:flex-1={fillParent}
	class:h-full={fillParent}
>
	<MenziesTable
		title={NURSING_EMR_ORDER_HISTORY_TITLE}
		rows={items}
		{columns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		bind:columnFilters
		emptyMessage="No service items for this visit yet."
		showRowActions={true}
		actionsHeader="Actions"
		actionsVariant="none"
		enableColumnFilters={true}
		showAddButton={Boolean(onAdd)}
		{addLabel}
		onAdd={() => onAdd?.()}
		on:refresh={() => onRefresh?.()}
		on:filtersChange={(event) => onFiltersChange?.(event.detail.filters)}
		{fillParent}
		{embedded}
	>
		{#snippet rowActions(row, _rowIndex)}
			<MenziesTableIconAction
				tooltipText={m.menzies_table_tooltip_delete()}
				color="error"
				disabled={Boolean(row.lockedByClosedOpBill)}
				onClick={() => onDelete(row)}
			>
				{#snippet icon()}
					<LucideTrash2 className="size-4" />
				{/snippet}
			</MenziesTableIconAction>
		{/snippet}
	</MenziesTable>
</div>
