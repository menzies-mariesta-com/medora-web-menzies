<script lang="ts">
import { createEventDispatcher } from 'svelte';

	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiPagination from '$lib/component/library/daisyui/pagination/DaisyUiPagination.svelte';
	import DaisyUiPaginationItem from '$lib/component/library/daisyui/pagination/item/DaisyUiPaginationItem.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import LucideChevronLeft from '$lib/component/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/library/lucide/LucideChevronRight.svelte';
	import LucideRefreshCcw from '$lib/component/library/lucide/LucideRefreshCcw.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';

	export type MariTableColumn<T = any> = {
		/**
		 * Unique id for the column, also used as fallback key for value lookup.
		 */
		id: string;
		/**
		 * Header text shown in the table.
		 */
		header: string;
		/**
		 * Dot-notation path into the row object, e.g. `patient.name`.
		 * If omitted, `row[id]` will be used.
		 */
		field?: string;
		/**
		 * Optional tailwind / daisyui width class, e.g. `w-32 min-w-[8rem]`.
		 */
		widthClass?: string;
		headerClass?: string;
		cellClass?: string;
		/**
		 * Optional formatter for the cell value.
		 */
		format?: (value: any, row: T, rowIndex: number) => any;
	};

	const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

type RowEventDetail = any;

const dispatch = createEventDispatcher<{
	refresh: void;
	rowClick: RowEventDetail;
	view: RowEventDetail;
	edit: RowEventDetail;
	delete: RowEventDetail;
	select: RowEventDetail;
	filtersChange: {
		columnId: string;
		value: string;
		filters: Record<string, string>;
	};
}>();

	let {
		rows,
		columns,
		pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
		initialPageSize = 10,
		isLoading = false,
		showRefreshButton = true,
		refreshTooltip = 'Refresh',
		emptyMessage = 'No records found.',
		showRowActions = false,
		actionsHeader = 'Actions',
		enableColumnFilters = false,
		actionsVariant = 'none',
		useRemoteFilters = false
	} = $props<{
		rows: any[];
		columns: MariTableColumn[];
		pageSizeOptions?: number[];
		initialPageSize?: number;
		isLoading?: boolean;
		showRefreshButton?: boolean;
		refreshTooltip?: string;
		emptyMessage?: string;
		showRowActions?: boolean;
		actionsHeader?: string;
		enableColumnFilters?: boolean;
		actionsVariant?: 'none' | 'crud' | 'select';
		useRemoteFilters?: boolean;
	}>();

	let currentPage = $state(1);
	let pageSizeStr = $state(String(initialPageSize));
	let columnFilters = $state<Record<string, string>>({});

	const pageSize = $derived(Number(pageSizeStr) || 10);

	const hasActionsColumn = $derived(showRowActions || actionsVariant !== 'none');

	const filteredRows = $derived(
		useRemoteFilters
			? rows
			: rows.filter((row, index) => {
					for (const column of columns) {
						const rawFilter = columnFilters[column.id];
						const filter = rawFilter ? rawFilter.trim().toLowerCase() : '';
						if (!filter) continue;

						const cell = getCellValue(row, column, index);
						const valueStr = cell == null ? '' : String(cell).toLowerCase();
						if (!valueStr.includes(filter)) {
							return false;
						}
					}
					return true;
				})
	);

	const total = $derived(filteredRows.length);
	const totalPages = $derived(total === 0 ? 1 : Math.ceil(total / pageSize));

	const pageStart = $derived(total === 0 ? 0 : (currentPage - 1) * pageSize + 1);
	const pageEnd = $derived(Math.min(currentPage * pageSize, total));

	const pagedRows = $derived(
		filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	function getCellValue(row: any, column: MariTableColumn, index: number) {
		if (column.format) {
			const raw = column.field
				? column.field.split('.').reduce((acc: any, part) => acc?.[part], row)
				: (row as any)[column.id];
			return column.format(raw, row, index);
		}

		const path = column.field ?? column.id;
		const value = path.split('.').reduce((acc: any, part) => acc?.[part], row);
		return value ?? '—';
	}

	function goToPage(p: number) {
		if (p < 1 || p > totalPages || p === currentPage) return;
		currentPage = p;
	}

	function handlePageSizeChange() {
		currentPage = 1;
	}

	function handleRefresh() {
		dispatch('refresh');
	}

	function handleRowClick(row: any) {
		dispatch('rowClick', row);
	}

	function handleFilterInputEvent(columnId: string, event: Event) {
		const target = event.currentTarget as HTMLInputElement | null;
		const value = target?.value ?? '';
		const newFilters: Record<string, string> = {
			...columnFilters,
			[columnId]: value
		};

		columnFilters = newFilters;
		currentPage = 1;

		if (useRemoteFilters) {
			dispatch('filtersChange', {
				columnId,
				value,
				filters: newFilters
			});
		}
	}
</script>

<div class="flex h-full min-h-[40vh] flex-col gap-0">
	<!-- Top controls: per page, pagination, summary, refresh -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 px-4 py-2">
		<div class="flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2 whitespace-nowrap">
				<span class="text-sm">per page</span>
				<DaisyUiSelect
					className="d-select d-select-sm w-20"
					bind:value={pageSizeStr}
					onChange={handlePageSizeChange}
					disabled={isLoading}
				>
					{#each pageSizeOptions as size (size)}
						<option value={String(size)}>{size}</option>
					{/each}
				</DaisyUiSelect>
			</div>

			<DaisyUiPagination>
				<DaisyUiPaginationItem
					onClick={() => goToPage(currentPage - 1)}
					className="d-btn-sm d-btn-square"
					disabled={currentPage <= 1 || isLoading}
				>
					<LucideChevronLeft className="size-5" />
				</DaisyUiPaginationItem>
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p (p)}
					<DaisyUiPaginationItem
						className="d-btn-sm"
						onClick={() => goToPage(p)}
					>
						{p}
					</DaisyUiPaginationItem>
				{/each}
				<DaisyUiPaginationItem
					onClick={() => goToPage(currentPage + 1)}
					className="d-btn-sm d-btn-square"
					disabled={currentPage >= totalPages || isLoading}
				>
					<LucideChevronRight className="size-5" />
				</DaisyUiPaginationItem>
			</DaisyUiPagination>
		</div>

		<div class="flex items-center gap-3">
			<div class="text-sm opacity-80">
				{#if total > 0}
					<span>
						Showing <span class="text-success">{pageStart}–{pageEnd}</span> of
						<span class="text-error"> {total}</span> items
					</span>
				{:else}
					<span>Showing 0 of 0 items</span>
				{/if}
			</div>

			{#if showRefreshButton}
				<DaisyUiTooltip text={refreshTooltip}>
					<DaisyUiButton
						className="d-btn-sm d-btn-primary"
						onClick={handleRefresh}
						disabled={isLoading}
					>
						<LucideRefreshCcw className="size-5" />
					</DaisyUiButton>
				</DaisyUiTooltip>
			{/if}
		</div>
	</div>

	{#if isLoading && total === 0}
		<div class="flex flex-1 items-center justify-center">
			<DaisyUiLoading className="d-loading-xl" />
		</div>
	{:else}
		<div class="flex-1 min-h-0 overflow-auto px-4 py-2">
			<DaisyUiTable className="d-table d-table-sm">
				<DaisyUiTableHeader>
					<tr class="sticky top-0 z-10 bg-base-200">
						{#if hasActionsColumn}
							<th
								class="px-1 text-left whitespace-nowrap"
								style="width: 1%;"
							>
								{actionsHeader}
							</th>
						{/if}
						{#each columns as column (column.id)}
							<th class={column.headerClass ?? column.widthClass}>
								{#if enableColumnFilters}
									<input
										class="d-input d-input-sm w-full"
										type="text"
										placeholder={column.header}
										value={columnFilters[column.id] ?? ''}
										on:input={(event) => handleFilterInputEvent(column.id, event)}
									/>
								{:else}
									{column.header}
								{/if}
							</th>
						{/each}
					</tr>
				</DaisyUiTableHeader>
				<DaisyUiTableBody>
					{#if pagedRows.length === 0}
						<tr>
							<td
								colspan={columns.length + (hasActionsColumn ? 1 : 0)}
								class="py-6 text-center opacity-70"
							>
								{emptyMessage}
							</td>
						</tr>
					{:else}
						{#each pagedRows as row, index (row.id ?? index)}
							<tr
								class="hover:bg-info/20"
								on:click={() => handleRowClick(row)}
							>
								{#if hasActionsColumn}
									<td
										class="px-1 whitespace-nowrap"
										style="width: 1%;"
										on:click|stopPropagation
									>
										{#if actionsVariant === 'crud'}
											<div class="flex items-center gap-2">
												<DaisyUiButton
													className="d-btn-ghost d-btn-sm"
													onClick={() => dispatch('view', row)}
												>
													<LucideEye className="size-4" />
												</DaisyUiButton>
												<DaisyUiButton
													className="d-btn-ghost d-btn-sm d-btn-success"
													onClick={() => dispatch('edit', row)}
												>
													<LucidePencil className="size-4" />
												</DaisyUiButton>
												<DaisyUiButton
													className="d-btn-ghost d-btn-error d-btn-sm"
													onClick={() => dispatch('delete', row)}
												>
													<LucideTrash2 className="size-4" />
												</DaisyUiButton>
											</div>
										{:else if actionsVariant === 'select'}
											<DaisyUiButton
												className="d-btn-primary d-btn-sm"
												onClick={() => dispatch('select', row)}
											>
												Select
											</DaisyUiButton>
										{:else}
											<slot name="rowActions" {row} rowIndex={index} />
										{/if}
									</td>
								{/if}

								{#each columns as column (column.id)}
									<td class={column.cellClass ?? column.widthClass}>
										{getCellValue(row, column, index)}
									</td>
								{/each}
							</tr>
						{/each}
					{/if}
				</DaisyUiTableBody>
			</DaisyUiTable>
		</div>
	{/if}
</div>

