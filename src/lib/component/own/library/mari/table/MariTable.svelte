<script lang="ts">
	import { createEventDispatcher, type Snippet } from 'svelte';

	import DaisyUiTable from '$lib/component/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiPagination from '$lib/component/daisyui/pagination/DaisyUiPagination.svelte';
	import DaisyUiPaginationItem from '$lib/component/daisyui/pagination/item/DaisyUiPaginationItem.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
import LucideRefreshCcw from '$lib/component/own/library/lucide/LucideRefreshCcw.svelte';
import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';

	export type MariTableColumn<T = unknown> = {
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
		 * Optional per-row cell class generator.
		 */
		cellClassGetter?: (row: T, rowIndex: number) => string;
		/**
		 * Optional getter for rendering a custom Svelte component per cell.
		 * When provided, it takes precedence over the default value rendering.
		 */
		cellComponentGetter?:
			| ((
					row: T,
					rowIndex: number
				) => { component: unknown; props?: Record<string, unknown> } | null)
			| undefined;
		/**
		 * Whether this column should show a filter control when column filters are enabled.
		 * Defaults to true.
		 */
		filterable?: boolean;
		/**
		 * Type of header filter control to render.
		 * - "text" (default): simple text input
		 * - "select": dropdown select (options provided via filterOptions or filterOptionsGetter)
		 */
		filterType?: 'text' | 'select';
		/**
		 * Static options for select-style filters.
		 */
		filterOptions?: { value: string; label: string }[];
		/**
		 * Dynamic options for select-style filters. Called on each render so it can
		 * depend on reactive data in the parent.
		 */
		filterOptionsGetter?: () => { value: string; label: string }[];
		/**
		 * Optional default filter value for this column.
		 * Applied once when no value has been set yet.
		 */
		defaultFilterValue?: string;
		/**
		 * Optional formatter for the cell value.
		 */
		format?: (value: unknown, row: T, rowIndex: number) => unknown;
	};

	export type MariTableLegendItem = {
		id: string;
		label: string;
		colorClass: string;
	};

	/**
	 * Column definitions are generic in `MariTableColumn<T>`, but passing
	 * `MariTableColumn<MyRow>[]` to a prop typed as `MariTableColumn<unknown>[]`
	 * fails under TypeScript’s generic variance. Call sites use concrete row
	 * types; the table only passes rows as `unknown`. `any` keeps the contract
	 * ergonomic for all pages.
	 */
	export type MariTableColumnsInput = MariTableColumn<any>[];

	const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

	/** Emitted with concrete row types from each page; `any` avoids variance noise. */
	type RowEventDetail = any;
	type RowLike = Record<string, unknown>;

	const dispatch = createEventDispatcher<{
		refresh: void;
		rowClick: RowEventDetail;
		view: RowEventDetail;
		edit: RowEventDetail;
		delete: RowEventDetail;
		select: RowEventDetail;
		pageSizeChange: number;
		pageChange: number;
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
		pageSize = $bindable(String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)),
		currentPage = $bindable(1),
		totalRowCount,
		isLoading = false,
		showRefreshButton = true,
		refreshTooltip = 'Refresh',
		emptyMessage = 'No records found.',
		showRowActions = false,
		actionsHeader = 'Actions',
		enableColumnFilters = false,
		actionsVariant = 'none',
		/** When false and actionsVariant is crud, hide the view (eye) action. */
		crudShowView = true,
		useRemoteFilters = false,
		columnFilters = $bindable<Record<string, string>>({}),
		rowTooltipGetter,
		legendItems = [],
		rowClassGetter,
		/**
		 * When true, table fills a flex parent: toolbar stays fixed, only the table
		 * block scrolls vertically (use with a constrained wrapper, e.g. max-h-*).
		 */
		fillParent = false,
		rowActions,
		crudEditDisabled,
		crudDeleteDisabled
	} = $props<{
		rows: unknown[];
		columns: MariTableColumnsInput;
		pageSizeOptions?: number[];
		pageSize?: string;
		currentPage?: number;
		/** When set with useRemoteFilters, used for "Showing X–Y of Z" and pagination. */
		totalRowCount?: number;
		isLoading?: boolean;
		showRefreshButton?: boolean;
		refreshTooltip?: string;
		emptyMessage?: string;
		showRowActions?: boolean;
		actionsHeader?: string;
		enableColumnFilters?: boolean;
		actionsVariant?: 'none' | 'crud' | 'select';
		crudShowView?: boolean;
		useRemoteFilters?: boolean;
		/** Controlled filter state from parent. */
		columnFilters?: Record<string, string>;
		/** Optional legend items shown above the table. */
		legendItems?: MariTableLegendItem[];
		/** Optional row class generator. Useful for status color mapping with legend. */
		rowClassGetter?: (row: any, rowIndex: number) => string;
		/**
		 * Optional function to provide a tooltip for each row.
		 * Return a string to show as the native browser tooltip on row hover.
		 */
		rowTooltipGetter?: (row: any, rowIndex: number) => string;
		fillParent?: boolean;
		/** Custom actions cell when `actionsVariant` is `none` but the actions column is shown. */
		rowActions?: Snippet<[any, number]>;
		/** When true, the row’s edit control is disabled (e.g. OP billing lock). */
		crudEditDisabled?: (row: any) => boolean;
		crudDeleteDisabled?: (row: any) => boolean;
	}>();

	const rootClass = $derived(
		fillParent
			? 'flex min-h-0 min-w-0 flex-1 flex-col gap-0'
			: 'flex h-full min-h-[40vh] flex-col gap-0'
	);
	/** min-w-0 lets flex children shrink so wide tables scroll inside instead of expanding the card */
	const tableScrollClass = $derived(
		fillParent
			? 'min-h-0 min-w-0 flex-1 overflow-auto'
			: 'max-h-[60vh] min-w-0 overflow-auto'
	);
	const tableSectionClass = $derived(
		fillParent
			? 'flex min-h-0 min-w-0 flex-1 flex-col px-4 py-2'
			: 'min-w-0 px-4 py-2'
	);

	function getDefaultFilterValue(
		column: MariTableColumn
	): string | undefined {
		return column.defaultFilterValue;
	}

	$effect(() => {
		if (!enableColumnFilters) return;

		const nextFilters = { ...columnFilters };
		let changed = false;

		for (const column of columns) {
			if (!(column.filterable ?? true)) continue;
			if (Object.hasOwn(nextFilters, column.id)) continue;
			const defaultValue = getDefaultFilterValue(column);
			if (defaultValue == null || defaultValue === '') continue;
			nextFilters[column.id] = defaultValue;
			changed = true;
		}

		if (!changed) return;

		columnFilters = nextFilters;
		currentPage = 1;

		if (useRemoteFilters) {
			// Dispatch once for the combined set of changes
			dispatch('filtersChange', {
				columnId: '__init__',
				value: '',
				filters: nextFilters
			});
		}
	});

	const pageSizeNum = $derived(Number(pageSize) || 10);

	const hasActionsColumn = $derived(
		showRowActions || actionsVariant !== 'none'
	);

	const filteredRows = $derived(
		useRemoteFilters
			? rows
			: rows.filter((row: unknown, index: number) => {
					for (const column of columns) {
						const rawFilter = columnFilters[column.id];
						const filter = rawFilter
							? rawFilter.trim().toLowerCase()
							: '';
						if (!filter) continue;

						const cell = getCellValue(row as RowLike, column, index);
						const valueStr =
							cell == null ? '' : String(cell).toLowerCase();

						// For select filters, require an exact match; for text filters, use substring match.
						if (column.filterType === 'select') {
							if (valueStr !== filter) {
								return false;
							}
						} else if (!valueStr.includes(filter)) {
							return false;
						}
					}
					return true;
				})
	);

	function valueAtPath(row: RowLike, path: string): unknown {
		const parts = path.split('.');
		let cur: unknown = row;
		for (const part of parts) {
			if (typeof cur !== 'object' || cur === null) return undefined;
			cur = (cur as Record<string, unknown>)[part];
		}
		return cur;
	}

	const total = $derived(
		useRemoteFilters && totalRowCount != null
			? totalRowCount
			: filteredRows.length
	);
	const totalPages = $derived(
		total === 0 ? 1 : Math.ceil(total / pageSizeNum)
	);

	const pageStart = $derived(
		total === 0 ? 0 : (currentPage - 1) * pageSizeNum + 1
	);
	const pageEnd = $derived(
		Math.min(currentPage * pageSizeNum, total)
	);

	const pagedRows = $derived(
		useRemoteFilters
			? filteredRows
			: filteredRows.slice(
					(currentPage - 1) * pageSizeNum,
					currentPage * pageSizeNum
				)
	);

	function getCellValue(
		row: RowLike,
		column: MariTableColumn,
		index: number
	) {
		if (column.format) {
			const raw = column.field ? valueAtPath(row, column.field) : row[column.id];
			return column.format(raw, row, index);
		}

		const path = column.field ?? column.id;
		const value = valueAtPath(row, path);
		return value ?? '—';
	}

	function goToPage(p: number) {
		if (p < 1 || p > totalPages || p === currentPage) return;
		currentPage = p;
		dispatch('pageChange', p);
	}

	function handlePageSizeChange() {
		currentPage = 1;
		dispatch('pageSizeChange', pageSizeNum);
	}

	function handleRefresh() {
		dispatch('refresh');
	}

	function handleRowClick(row: unknown) {
		dispatch('rowClick', row);
	}

	function getVisiblePages() {
		const pages: Array<{ type: 'page' | 'ellipsis'; page?: number }> =
			[];

		const maxButtons = 5;

		if (totalPages <= maxButtons) {
			for (let p = 1; p <= totalPages; p += 1) {
				pages.push({ type: 'page', page: p });
			}
			return pages;
		}

		// Always show first and last page, and a sliding window around currentPage
		const windowSize = 3;
		let start = Math.max(2, currentPage - 1);
		let end = Math.min(totalPages - 1, currentPage + 1);

		if (start <= 2) {
			start = 2;
			end = Math.min(start + windowSize - 1, totalPages - 1);
		} else if (end >= totalPages - 1) {
			end = totalPages - 1;
			start = Math.max(end - windowSize + 1, 2);
		}

		pages.push({ type: 'page', page: 1 });

		if (start > 2) {
			pages.push({ type: 'ellipsis' });
		}

		for (let p = start; p <= end; p += 1) {
			pages.push({ type: 'page', page: p });
		}

		if (end < totalPages - 1) {
			pages.push({ type: 'ellipsis' });
		}

		pages.push({ type: 'page', page: totalPages });

		return pages;
	}

	function handleFilterInputEvent(columnId: string, event: Event) {
		const target = event.currentTarget as
			| HTMLInputElement
			| HTMLSelectElement
			| null;
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

<div class={rootClass}>
	<!-- Top controls: per page, pagination, summary, refresh (does not scroll) -->
	<div
		class="mari-table-toolbar flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-base-200 px-4 py-2"
	>
		<div class="flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2 whitespace-nowrap">
				<span class="text-sm">per page</span>
				<DaisyUiSelect
					className="d-select d-select-sm w-20"
					bind:value={pageSize}
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
				{#each getVisiblePages() as item, i (item.type === 'page' ? `page-${item.page}` : `ellipsis-${i}`)}
					{#if item.type === 'page'}
						<DaisyUiPaginationItem
							className={`d-btn-sm ${item.page === currentPage ? 'd-btn-active d-btn-primary' : ''}`}
							onClick={() => item.page && goToPage(item.page)}
						>
							{item.page}
						</DaisyUiPaginationItem>
					{:else}
						<DaisyUiPaginationItem
							className="d-btn-sm d-btn-disabled"
							disabled={true}
						>
							…
						</DaisyUiPaginationItem>
					{/if}
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

		{#if legendItems.length > 0}
			<div
				class="flex flex-wrap items-center justify-center gap-x-7 gap-y-2"
			>
				{#each legendItems as legend (legend.id)}
					<div class="flex items-center gap-2">
						<span
							class={`border-base-500/500 h-5 w-5 rounded-md border ${legend.colorClass}`.trim()}
							aria-hidden="true"
						></span>
						{legend.label}
					</div>
				{/each}
			</div>
		{/if}

		<div class="flex items-center gap-3">
			<div class="text-sm opacity-80">
				{#if total > 0}
					<span>
						Showing <span class="text-success"
							>{pageStart}–{pageEnd}</span
						>
						of
						<span class="text-error"> {total}</span> items
					</span>
				{:else}
					<span>Showing 0 of 0 items</span>
				{/if}
			</div>

			{#if showRefreshButton}
				<DaisyUiTooltip tooltipText={refreshTooltip}>
					<DaisyUiButton
						className="d-btn-sm d-btn-primary"
						onClick={handleRefresh}
						disabled={isLoading}
						loading={isLoading}
						loadingText=""
					>
						<LucideRefreshCcw className="size-5" />
					</DaisyUiButton>
				</DaisyUiTooltip>
			{/if}
		</div>
	</div>

	<div class={tableSectionClass}>
		<div class={tableScrollClass}>
			<DaisyUiTable
				className="d-table d-table-zebra d-table-sm w-max min-w-full"
			>
				<DaisyUiTableHeader>
					<tr
						class="mari-table-header-filters sticky top-0 z-30 bg-base-200"
					>
						{#if hasActionsColumn}
							<th
								class="px-1 text-left whitespace-nowrap"
								style="width: 1%;"
							>
								{actionsHeader}
							</th>
						{/if}
						{#each columns as column (column.id)}
							{@const isFilterable =
								enableColumnFilters && (column.filterable ?? true)}
							{@const filterType = column.filterType ?? 'text'}
							{@const selectOptions = column.filterOptionsGetter
								? column.filterOptionsGetter()
								: column.filterOptions}
							<th class={column.headerClass ?? column.widthClass}>
								{#if isFilterable}
									{#if filterType === 'select' && selectOptions}
										<select
											class="d-select w-full d-select-sm"
											value={columnFilters[column.id] ?? ''}
											onchange={(event) =>
												handleFilterInputEvent(column.id, event)}
										>
											<option value="">All</option>
											{#each selectOptions as opt (opt.value)}
												<option value={opt.value}>
													{opt.label}
												</option>
											{/each}
										</select>
									{:else}
										<input
											class="d-input d-input-sm w-full"
											type="text"
											placeholder={column.header}
											value={columnFilters[column.id] ?? ''}
											oninput={(event) =>
												handleFilterInputEvent(column.id, event)}
										/>
									{/if}
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
								{#if isLoading}
									<DaisyUiLoading className="d-loading-md" />
								{:else}
									{emptyMessage}
								{/if}
							</td>
						</tr>
					{:else}
						{#each pagedRows as row, index (row.id ?? index)}
							{@const rowTooltipText = rowTooltipGetter
								? rowTooltipGetter(row, index)
								: ''}
							{@const customRowClass = rowClassGetter
								? rowClassGetter(row, index)
								: ''}
							<tr
								class={`hover:bg-info/20 ${customRowClass}`.trim()}
								title={rowTooltipText || undefined}
								onclick={() => handleRowClick(row)}
							>
								{#if hasActionsColumn}
									<td
										class="px-1 whitespace-nowrap"
										style="width: 1%;"
										onclick={(e) => e.stopPropagation()}
									>
										{#if actionsVariant === 'crud'}
											{@const editLocked = crudEditDisabled?.(row) ?? false}
											{@const deleteLocked = crudDeleteDisabled?.(row) ?? false}
											<div class="flex items-center gap-2">
												{#if crudShowView}
													<DaisyUiTooltip
														tooltipText="View"
														className="d-tooltip-right"
													>
														<DaisyUiButton
															className="d-btn-ghost d-btn-sm d-btn-square"
															onClick={() => dispatch('view', row)}
														>
															<LucideEye className="size-4" />
														</DaisyUiButton>
													</DaisyUiTooltip>
												{/if}
												<DaisyUiTooltip
													tooltipText="Edit"
													className="d-tooltip-right"
												>
													<DaisyUiButton
														className="d-btn-ghost d-btn-sm d-btn-square d-btn-success"
														disabled={editLocked}
														onClick={() => dispatch('edit', row)}
													>
														<LucidePencil className="size-4" />
													</DaisyUiButton>
												</DaisyUiTooltip>
												<DaisyUiTooltip
													tooltipText="Delete"
													className="d-tooltip-right"
												>
													<DaisyUiButton
														className="d-btn-ghost d-btn-error d-btn-sm d-btn-square"
														disabled={deleteLocked}
														onClick={() => dispatch('delete', row)}
													>
														<LucideTrash2 className="size-4" />
													</DaisyUiButton>
												</DaisyUiTooltip>
											</div>
										{:else if actionsVariant === 'select'}
											<DaisyUiTooltip
												tooltipText="Select"
												className="d-tooltip-right"
											>
												<DaisyUiButton
													className="d-btn-primary d-btn-sm d-btn-square"
													onClick={() => dispatch('select', row)}
												>
													<LucideCircleCheck className="size-4" />
												</DaisyUiButton>
											</DaisyUiTooltip>
										{:else}
											{@render rowActions?.(row, index)}
										{/if}
									</td>
								{/if}

								{#each columns as column (column.id)}
									{@const cellComponent = column.cellComponentGetter
										? column.cellComponentGetter(row, index)
										: null}
									<td
										class={`${column.widthClass ?? ''} ${column.cellClass ?? ''} ${column.cellClassGetter ? column.cellClassGetter(row, index) : ''}`.trim()}
									>
										{#if cellComponent && cellComponent.component}
											{@const Component = cellComponent.component}
											<Component {...(cellComponent.props ?? {})} />
										{:else}
											{getCellValue(row, column, index)}
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					{/if}
				</DaisyUiTableBody>
			</DaisyUiTable>
		</div>
	</div>
</div>
