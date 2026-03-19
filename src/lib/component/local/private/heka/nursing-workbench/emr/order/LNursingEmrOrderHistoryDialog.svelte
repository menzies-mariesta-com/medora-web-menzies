<script lang="ts">
	import DaisyUiModal from '$lib/component/library/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { ServiceOrderDetailSchema } from '$lib/server/db/schema-type';
	import { StatusEnum } from '$lib/model/enum/db-link';

	type HistoryItem = ServiceOrderDetailSchema & {
		orderNo: string | null;
		advisingDoctorName: string | null;
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
			id: 'instruction',
			header: 'Description',
			widthClass: 'w-64',
			filterable: false,
			format: (_value, row) =>
				(row.instruction as string | null | undefined)?.trim() ||
				`Service ${row.serviceId ?? ''}`
		},
		{
			id: 'serviceAmount',
			header: 'Service Amount',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => {
				if (value == null || value === '') return '–';
				const n = Number(value);
				if (!Number.isFinite(n)) return String(value);
				return n.toLocaleString('en-US', {
					minimumFractionDigits: 0,
					maximumFractionDigits: 2
				});
			}
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
			format: (value) => {
				if (value == null || value === '') return '–';
				const n = Number(value);
				if (!Number.isFinite(n)) return String(value);
				return n.toLocaleString('en-US', {
					minimumFractionDigits: 0,
					maximumFractionDigits: 2
				});
			}
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
		},
		{
			id: 'amountDisplay',
			header: 'Amount',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => {
				if (value == null || value === '') return '–';
				const n = Number(value);
				if (!Number.isFinite(n)) return String(value);
				return n.toLocaleString('en-US', {
					minimumFractionDigits: 0,
					maximumFractionDigits: 2
				});
			}
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
			{#if isLoading}
				<div class="flex min-h-24 items-center justify-center">
					<DaisyUiLoading className="d-loading-lg" />
				</div>
			{:else if items.length === 0}
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
						<svelte:fragment slot="rowActions" let:row>
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
						</svelte:fragment>
					</MariTable>
				</div>
			{/if}
		</div>
	</DaisyUiModal>
{/if}
