<script lang="ts">
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { ServiceOrderDetailListRow } from '$lib/model/type/heka/ui-rows.type';
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

	const columns: MariTableColumn<HistoryItem>[] = [
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
	<DaisyUiModal groupName="order-history-modal" open={true} {onClose}>
		<div
			class="d-modal-box h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none"
			role="document"
		>
			<div class="mb-3 flex items-center justify-between">
				<DaisyUiCardBodyTitle className="mb-0">
					Order history (this visit)
				</DaisyUiCardBodyTitle>
				<DaisyUiButton
					className="d-btn-ghost d-btn-sm"
					onClick={onClose}
				>
					Close
				</DaisyUiButton>
			</div>
			{#if items.length === 0 && !isLoading}
				<p class="text-sm text-base-content/70">
					No service items for this visit yet.
				</p>
			{:else}
				<div class="flex flex-col gap-3 {TableEnum.HEIGHT_SMALL}">
					<MariTable
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
							<td class="w-24 shrink-0 text-right">
								<div class="flex justify-end gap-1">
									<DaisyUiButton
										className="d-btn-ghost d-btn-error d-btn-sm"
										onClick={() => onDelete(row)}
									>
										<LucideTrash2 className="size-4" />
									</DaisyUiButton>
								</div>
							</td>
						{/snippet}
					</MariTable>
				</div>
			{/if}
		</div>
	</DaisyUiModal>
{/if}
