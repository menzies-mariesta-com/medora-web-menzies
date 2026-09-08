<script lang="ts">
	import WashModal from '$lib/component/wash/modal/WashModal.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import { m } from '$lib/paraglide/messages';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { ServiceOrderDetailListRow } from '$lib/model/type/medora/ui-rows.type';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { formatNumberDisplay } from '$lib/util/number-display.util';

	type HistoryItem = ServiceOrderDetailListRow & {
		orderNo: string | null;
		advisingDoctorName: string | null;
		serviceName: string;
		subCategoryName: string;
	};

	const { open, onClose, items, isLoading, pageSizeStr, onDelete } =
		$props<{
			open: boolean;
			onClose: () => void;
			items: HistoryItem[];
			isLoading: boolean;
			pageSizeStr: string;
			onDelete: (row: HistoryItem) => void;
		}>();

	const columns: MenziesTableColumn<HistoryItem>[] = [
		{
			id: 'orderNo',
			header: 'Order No',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => (value ? String(value) : '–')
		},
		{
			id: 'serviceId',
			header: 'No.',
			widthClass: 'w-16',
			filterable: false,
			format: (_value, _row, index) => String(index + 1)
		},
		{
			id: 'serviceName',
			header: 'Service Name',
			widthClass: 'w-64',
			filterable: false,
			format: (_value, row) => row.serviceName || '–'
		},
		{
			id: 'subCategoryName',
			header: 'Sub category',
			widthClass: 'w-48',
			filterable: false,
			format: (_value, row) =>
				row.subCategoryName?.trim() ? row.subCategoryName : '–'
		},
		{
			id: 'instruction',
			header: 'Description',
			widthClass: 'w-64',
			filterable: false,
			format: (_value, row) =>
				(row.instruction as string | null | undefined)?.trim() || '–'
		},
		{
			id: 'serviceUnit',
			header: 'Unit',
			widthClass: 'w-20',
			filterable: false,
			format: (value) => (value != null ? String(value) : '–')
		},
		{
			id: 'serviceTaxAmount',
			header: 'Tax',
			widthClass: 'w-24',
			filterable: false,
			format: (value) => formatNumberDisplay(value as any)
		},
		{
			id: 'isUrgent',
			header: 'Urgent',
			widthClass: 'w-20',
			filterable: false,
			format: (_value, row) => (row.isUrgent ? 'Yes' : 'No')
		},
		{
			id: 'advisingDoctorName',
			header: 'Advising Doctor',
			widthClass: 'w-40',
			filterable: false,
			format: (_value, row) =>
				row.advisingDoctorName && row.advisingDoctorName.trim()
					? row.advisingDoctorName
					: '–'
		},
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-28',
			filterable: false,
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: row.statusId === StatusEnum.DELETED
							? 'Deleted'
							: `Status ${row.statusId ?? 'Unknown'}`
		}
	];
</script>

{#if open}
	<WashModal groupName="order-history-modal" open={true} {onClose}>
		<div
			class="modal-box h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none"
			role="document"
		>
			<div class="mb-3 flex items-center justify-between">
				<WashCardBodyTitle className="mb-0">
					Order history (this visit)
				</WashCardBodyTitle>
				<WashButton
					className="btn-ghost btn-sm"
					onClick={onClose}
				>
					Close
				</WashButton>
			</div>
			{#if items.length === 0 && !isLoading}
				<p class="text-sm text-base-content/70">
					No service items for this visit yet.
				</p>
			{:else}
				<div class="flex flex-col gap-3 {TableEnum.HEIGHT_SMALL}">
					<MenziesTable
						rows={items}
						{columns}
						{isLoading}
						pageSize={pageSizeStr}
						currentPage={1}
						showRefreshButton={false}
						emptyMessage="No items."
						showRowActions={true}
						actionsHeader="Actions"
						actionsVariant="none"
						enableColumnFilters={false}
					>
						{#snippet rowActions(row, rowIndex)}
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
			{/if}
		</div>
	</WashModal>
{/if}
