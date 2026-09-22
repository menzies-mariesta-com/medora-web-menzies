<!--
	MenziesTable — Design Data Table chrome (header / sticky thead / single scroll body / footer / legends).

	Usage:
	- Pass `title` / `description` for Design header chrome; optional `headerActions` / `addAction` snippets.
	- Column filters are backend-only: never filter `rows` here. When `enableColumnFilters` is on,
	  filter changes update `columnFilters` and dispatch `filtersChange` for the parent API reload.
	- Remote paging: set `totalRowCount` (and supply already-paged `rows`). Omit it only for
	  small client-sliced lists (e.g. embedded pickers).
-->
<script lang="ts">
	import { createEventDispatcher, type Snippet } from 'svelte';

	import WashTable from '$lib/component/wash/table/WashTable.svelte';
	import WashTableHeader from '$lib/component/wash/table/head/WashTableHeader.svelte';
	import WashTableBody from '$lib/component/wash/table/body/WashTableBody.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import LucideRefreshCcw from '$lib/component/own/library/lucide/LucideRefreshCcw.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import MenziesTableExportToolbar from '$lib/component/own/library/menzies/table/MenziesTableExportToolbar.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import type { MenziesTableExportConfig } from '$lib/model/type/menzies-table-export.type';
	import { m } from '$lib/paraglide/messages';
	import {
		fetchMenziesTableMasterFilterOptions,
		type MenziesSelectFilterOption,
		type MenziesTableFilterMasterKey
	} from '$lib/tool/menzies/menzies-table-master-filter-options.util.svelte.ts';
	import { normalizeMenziesTableColumns } from '$lib/tool/menzies/menzies-table-columns.util';

	export type { MenziesTableFilterMasterKey };

	export type MenziesTableColumn<T = unknown> = {
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
			  ) => {
					component: unknown;
					props?: Record<string, unknown>;
			  } | null)
			| undefined;
		/**
		 * Whether this column should show a filter control when column filters are enabled.
		 * Defaults to true.
		 */
		filterable?: boolean;
		/**
		 * Type of header filter control to render.
		 * - "text" (default): simple text input
		 * - "select": dropdown select (options from filterMasterKey, filterOptions, or filterOptionsGetter)
		 */
		filterType?: 'text' | 'select';
		/**
		 * Load select options from master data, not from the current table rows.
		 * Keys: `store`, `supplier`, `severity`, `itemCategory`, `unitType`, `visitType`.
		 * Requires `masterFilterHospitalId` on MenziesTable (except `severity`).
		 */
		filterMasterKey?: MenziesTableFilterMasterKey;
		/**
		 * Static options for select-style filters.
		 */
		filterOptions?: { value: string; label: string }[];
		/**
		 * Dynamic options for select-style filters. Prefer `filterMasterKey` when
		 * options should come from master data rather than the loaded table rows.
		 */
		filterOptionsGetter?: () => { value: string; label: string }[];
		/**
		 * Label for the empty select option (no filter). Defaults to
		 * “All {header}” via i18n when omitted.
		 */
		filterEmptyLabel?: string;
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

	export type MenziesTableLegendItem = {
		id: string;
		label: string;
		colorClass: string;
	};

	/**
	 * Column definitions are generic in `MenziesTableColumn<T>`, but passing
	 * `MenziesTableColumn<MyRow>[]` to a prop typed as `MenziesTableColumn<unknown>[]`
	 * fails under TypeScript’s generic variance. Call sites use concrete row
	 * types; the table only passes rows as `unknown`. `any` keeps the contract
	 * ergonomic for all pages.
	 */
	export type MenziesTableColumnsInput = MenziesTableColumn<any>[];

	const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

	/** Emitted with concrete row types from each page; `any` avoids variance noise. */
	type RowEventDetail = any;
	type RowLike = Record<string, unknown>;

	const dispatch = createEventDispatcher<{
		refresh: void;
		add: void;
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
		columnFilters = $bindable<Record<string, string>>({}),
		legendItems = [],
		legendTitle = '',
		rowClassGetter,
		/**
		 * When true, table fills a flex parent: toolbar stays fixed, only the table
		 * block scrolls vertically (use with a constrained wrapper, e.g. max-h-*).
		 */
		fillParent = false,
		rowActions,
		crudEditDisabled,
		crudDeleteDisabled,
		enableExport = false,
		exportConfig,
		/** Hospital scope for `filterMasterKey` store / supplier options. */
		masterFilterHospitalId,
		/** Design DataTableHeader title. */
		title = '',
		/** Design DataTableHeader description. */
		description = '',
		/** Show Design footer Add button. */
		showAddButton = false,
		addLabel = 'Add',
		addDisabled = false,
		onAdd,
		headerActions,
		addAction
	} = $props<{
		rows: unknown[];
		columns: MenziesTableColumnsInput;
		pageSizeOptions?: number[];
		pageSize?: string;
		currentPage?: number;
		/**
		 * When set, remote mode: parent supplies already-paged rows and this total
		 * drives "Showing X–Y of Z" and pagination.
		 */
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
		/** Controlled filter state from parent. */
		columnFilters?: Record<string, string>;
		/** Optional legend items shown under the footer (Design DataTableLegendsRow). */
		legendItems?: MenziesTableLegendItem[];
		/** Optional legends row title. */
		legendTitle?: string;
		/** Optional row class generator. Useful for status color mapping with legend. */
		rowClassGetter?: (row: any, rowIndex: number) => string;
		fillParent?: boolean;
		/** Custom actions cell when `actionsVariant` is `none` but the actions column is shown. */
		rowActions?: Snippet<[any, number]>;
		/** When true, the row’s edit control is disabled (e.g. OP billing lock). */
		crudEditDisabled?: (row: any) => boolean;
		crudDeleteDisabled?: (row: any) => boolean;
		/** Show CSV / Excel / PDF / Print export buttons in the footer controls. */
		enableExport?: boolean;
		exportConfig?: MenziesTableExportConfig;
		masterFilterHospitalId?: string;
		title?: string;
		description?: string;
		showAddButton?: boolean;
		addLabel?: string;
		addDisabled?: boolean;
		onAdd?: () => void;
		/** Extra controls in the header (right of title), e.g. search. */
		headerActions?: Snippet;
		/** Custom Add control; when set, replaces the default Add button. */
		addAction?: Snippet;
	}>();

	let masterFilterOptions = $state<
		Partial<Record<MenziesTableFilterMasterKey, MenziesSelectFilterOption[]>>
	>({});
	let masterFilterLoadId = 0;

	$effect(() => {
		const hospitalId = masterFilterHospitalId?.trim() ?? '';
		if (!enableColumnFilters) return;

		const keysNeeded = new Set<MenziesTableFilterMasterKey>();
		for (const column of displayColumns) {
			if (column.filterMasterKey) {
				keysNeeded.add(column.filterMasterKey);
			}
		}
		if (keysNeeded.size === 0) return;

		const loadId = ++masterFilterLoadId;
		const ac = new AbortController();

		(async () => {
			const next: Partial<
				Record<MenziesTableFilterMasterKey, MenziesSelectFilterOption[]>
			> = { ...masterFilterOptions };

			for (const key of keysNeeded) {
				try {
					next[key] = await fetchMenziesTableMasterFilterOptions(
						key,
						hospitalId || undefined,
						ac.signal
					);
				} catch (e) {
					if (e instanceof DOMException && e.name === 'AbortError') {
						return;
					}
					next[key] = [];
				}
			}

			if (loadId !== masterFilterLoadId) return;
			masterFilterOptions = next;
		})();

		return () => {
			ac.abort();
		};
	});

	function resolveSelectFilterOptions(
		column: MenziesTableColumn
	): MenziesSelectFilterOption[] | undefined {
		if (column.filterMasterKey) {
			return masterFilterOptions[column.filterMasterKey] ?? [];
		}
		if (column.filterOptionsGetter) {
			return column.filterOptionsGetter();
		}
		return column.filterOptions;
	}

	const exportEnabled = $derived(
		enableExport && exportConfig != null && exportConfig.columns.length > 0
	);

	async function resolveExportRows(): Promise<Record<string, unknown>[]> {
		if (exportConfig?.fetchExportRows) {
			return await exportConfig.fetchExportRows();
		}
		return rows.map((row) => ({ ...(row as RowLike) }));
	}

	/**
	 * Design Data table chrome: flex-col shell, single scroll body, shrink-0 footer.
	 * App height = h-full (default) or flex-1 when fillParent — never a fixed demo height.
	 */
	const rootClass = $derived(
		[
			'wash-allow-dropdown-overflow menzies-table-shell border-base-300 rounded-box flex min-h-0 min-w-0 flex-col overflow-hidden border bg-base-100 shadow-sm transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-within:-translate-y-0.5 focus-within:border-primary/40 focus-within:shadow-md',
			fillParent ? 'flex-1' : 'h-full'
		].join(' ')
	);
	/** Design body scroll + opaque base so shell hover:bg-primary/5 does not tint rows */
	const tableScrollClass =
		'wash-allow-dropdown-overflow menzies-table-scroll bg-base-100 min-h-0 min-w-0 flex-1 overflow-auto';

	function getDefaultFilterValue(
		column: MenziesTableColumn
	): string | undefined {
		return column.defaultFilterValue;
	}

	function selectFilterEmptyLabel(column: MenziesTableColumn): string {
		if (column.filterEmptyLabel?.trim()) {
			return column.filterEmptyLabel.trim();
		}

		const id = column.id.toLowerCase();

		if (
			id === 'status' ||
			id === 'statusid' ||
			id === 'statustaggingid' ||
			id === 'visitstatus'
		) {
			return id === 'visitstatus'
				? m.menzies_table_filter_all_visit_statuses()
				: m.inv_di_status_filter_all();
		}

		if (id.includes('supplier')) {
			return m.menzies_table_filter_all_suppliers();
		}

		if (id.includes('category') || column.filterMasterKey === 'itemCategory') {
			return m.service_item_all_categories();
		}

		if (id === 'storeid' || id === 'store') {
			return m.inv_report_filter_store_all();
		}

		if (id === 'kind') {
			return m.inv_report_filter_kind_all();
		}

		if (id === 'severity') {
			return m.menzies_table_filter_all_severities();
		}

		if (id.includes('generic')) {
			return m.med_order_int_all_generics();
		}

		if (id.includes('unittype')) {
			return m.menzies_table_filter_all_unit_types();
		}

		if (id === 'visittype') {
			return m.menzies_table_filter_all_visit_types();
		}

		return m.menzies_table_filter_all_for_column({ column: column.header });
	}

	function selectOptionsIncludeEmpty(
		options: { value: string; label: string }[] | undefined
	): boolean {
		return options?.some((o) => o.value === '') ?? false;
	}

	$effect(() => {
		if (!enableColumnFilters) return;

		const nextFilters = { ...columnFilters };
		let changed = false;

		for (const column of displayColumns) {
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

		dispatch('filtersChange', {
			columnId: '__init__',
			value: '',
			filters: nextFilters
		});
	});

	const pageSizeNum = $derived(Number(pageSize) || 10);

	const displayColumns = $derived(
		normalizeMenziesTableColumns(columns, {
			currentPage,
			pageSize: pageSizeNum
		})
	);

	const hasActionsColumn = $derived(
		showRowActions || actionsVariant !== 'none'
	);

	/** Remote mode: parent owns paging/filtering when totalRowCount is provided. */
	const isRemote = $derived(totalRowCount != null);

	function valueAtPath(row: RowLike, path: string): unknown {
		const parts = path.split('.');
		let cur: unknown = row;
		for (const part of parts) {
			if (typeof cur !== 'object' || cur === null) return undefined;
			cur = (cur as Record<string, unknown>)[part];
		}
		return cur;
	}

	function getRowKey(row: unknown, index: number): string | number {
		if (row != null && typeof row === 'object' && 'id' in row) {
			const id = (row as { id: unknown }).id;
			if (typeof id === 'string' || typeof id === 'number') return id;
		}
		return index;
	}

	const total = $derived(isRemote ? (totalRowCount as number) : rows.length);
	const totalPages = $derived(
		total === 0 ? 1 : Math.ceil(total / pageSizeNum)
	);

	const pageStart = $derived(
		total === 0 ? 0 : (currentPage - 1) * pageSizeNum + 1
	);
	const pageEnd = $derived(Math.min(currentPage * pageSizeNum, total));

	/** Remote: show rows as-is. Client: slice for embedded pickers only. Never filter by columnFilters. */
	const pagedRows = $derived(
		isRemote
			? rows
			: rows.slice(
					(currentPage - 1) * pageSizeNum,
					currentPage * pageSizeNum
				)
	);

	function asRowLike(row: unknown): RowLike {
		return row != null && typeof row === 'object' ? (row as RowLike) : {};
	}

	function getCellValue(
		row: unknown,
		column: MenziesTableColumn,
		index: number
	) {
		const rowLike = asRowLike(row);
		if (column.format) {
			const raw = column.field
				? valueAtPath(rowLike, column.field)
				: rowLike[column.id];
			return column.format(raw, rowLike, index);
		}

		const path = column.field ?? column.id;
		const value = valueAtPath(rowLike, path);
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

	function handleAdd() {
		onAdd?.();
		dispatch('add');
	}

	function handleRowClick(row: unknown) {
		dispatch('rowClick', row);
	}

	const hasHeader = $derived(
		Boolean(title?.trim()) ||
			Boolean(description?.trim()) ||
			headerActions != null
	);

	const showingSummary = $derived(
		total > 0
			? `Showing ${pageStart}-${pageEnd} of ${total}`
			: 'Showing 0 of 0'
	);

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

		if (enableColumnFilters) {
			dispatch('filtersChange', {
				columnId,
				value,
				filters: newFilters
			});
		}
	}
</script>

<div class={rootClass}>
	{#if hasHeader}
		<!-- Design DataTableHeader -->
		<div
			class="border-base-300 bg-base-100 flex shrink-0 items-start justify-between gap-3 border-b px-3 py-2.5"
		>
			<div class="min-w-0 flex-1">
				{#if title?.trim()}
					<h2 class="text-base-content text-base font-bold leading-tight">
						{title}
					</h2>
				{/if}
				{#if description?.trim()}
					<p class="text-ink-muted mt-0.5 text-xs">{description}</p>
				{/if}
			</div>
			{#if headerActions}
				<div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
					{@render headerActions()}
				</div>
			{/if}
		</div>
	{/if}

	<div class={tableScrollClass}>
		<WashTable
			useRecipe={false}
			className="table table-zebra [&_tbody_tr]:hover:bg-primary/40 w-max min-w-full"
		>
			<WashTableHeader className="bg-base-100 sticky top-0 z-10">
				<tr>
					{#if hasActionsColumn}
						<th class="menzies-table-actions-col text-left">
							<span class="font-bold">{actionsHeader}</span>
						</th>
					{/if}
					{#each displayColumns as column (column.id)}
						<th class={column.headerClass ?? column.widthClass}>
							<span class="font-bold">{column.header}</span>
						</th>
					{/each}
				</tr>
				{#if enableColumnFilters}
					<tr>
						{#if hasActionsColumn}
							<th class="menzies-table-actions-col"></th>
						{/if}
						{#each displayColumns as column (column.id)}
							{@const isFilterable = column.filterable ?? true}
							{@const filterType = column.filterType ?? 'text'}
							{@const selectOptions = resolveSelectFilterOptions(column)}
							<th class={column.headerClass ?? column.widthClass}>
								{#if isFilterable}
									{#if filterType === 'select' && selectOptions}
										<select
											class="select select-xs select-bordered w-full max-w-[10rem] cursor-pointer"
											aria-label="Filter by {column.header}"
											value={columnFilters[column.id] ?? ''}
											onchange={(event) =>
												handleFilterInputEvent(column.id, event)}
										>
											{#if !selectOptionsIncludeEmpty(selectOptions)}
												<option value="">
													{selectFilterEmptyLabel(column)}
												</option>
											{/if}
											{#each selectOptions as opt (opt.value)}
												<option value={opt.value}>
													{opt.label}
												</option>
											{/each}
										</select>
									{:else}
										<input
											class="input input-xs input-bordered w-full max-w-[10rem] cursor-text"
											type="text"
											placeholder="Filter…"
											aria-label="Filter by {column.header}"
											value={columnFilters[column.id] ?? ''}
											oninput={(event) =>
												handleFilterInputEvent(column.id, event)}
										/>
									{/if}
								{/if}
							</th>
						{/each}
					</tr>
				{/if}
			</WashTableHeader>
			<WashTableBody>
				{#if pagedRows.length === 0}
					<tr>
						<td
							colspan={displayColumns.length + (hasActionsColumn ? 1 : 0)}
							class="py-6 text-center opacity-70"
						>
							{#if isLoading}
								<span class="loading loading-spinner loading-md"></span>
							{:else}
								{emptyMessage}
							{/if}
						</td>
					</tr>
				{:else}
					{#each pagedRows as row, index (getRowKey(row, index))}
						{@const customRowClass = rowClassGetter
							? rowClassGetter(row, index)
							: ''}
						<tr
							class={customRowClass}
							onclick={() => handleRowClick(row)}
						>
							{#if hasActionsColumn}
								<td
									class="menzies-table-actions-col relative z-0 overflow-visible px-1"
									onclick={(e) => e.stopPropagation()}
								>
									{#if actionsVariant === 'crud'}
										{@const editLocked =
											crudEditDisabled?.(row) ?? false}
										{@const deleteLocked =
											crudDeleteDisabled?.(row) ?? false}
										<MenziesTableRowActionGroup>
											{#if crudShowView}
												<MenziesTableIconAction
													tooltipText={m.menzies_table_tooltip_view()}
													color="primary"
													onClick={() => dispatch('view', row)}
												>
													{#snippet icon()}
														<LucideEye className="size-3.5" />
													{/snippet}
												</MenziesTableIconAction>
											{/if}
											<MenziesTableIconAction
												tooltipText={m.menzies_table_tooltip_edit()}
												color="secondary"
												disabled={editLocked}
												onClick={() => dispatch('edit', row)}
											>
												{#snippet icon()}
													<LucidePencil className="size-3.5" />
												{/snippet}
											</MenziesTableIconAction>
											<MenziesTableIconAction
												tooltipText={m.menzies_table_crud_inactivate_tooltip()}
												color="error"
												disabled={deleteLocked}
												onClick={() => dispatch('delete', row)}
											>
												{#snippet icon()}
													<LucideTrash2 className="size-3.5" />
												{/snippet}
											</MenziesTableIconAction>
										</MenziesTableRowActionGroup>
									{:else if actionsVariant === 'select'}
										<MenziesTableIconAction
											tooltipText={m.menzies_table_tooltip_select()}
											color="primary"
											onClick={() => dispatch('select', row)}
										>
											{#snippet icon()}
												<LucideCircleCheck className="size-3.5" />
											{/snippet}
										</MenziesTableIconAction>
									{:else}
										{@render rowActions?.(row, index)}
									{/if}
								</td>
							{/if}

							{#each displayColumns as column (column.id)}
								{@const cellComponent = column.cellComponentGetter
									? column.cellComponentGetter(row, index)
									: null}
								<td
									class={`${column.widthClass ?? ''} ${column.cellClass ?? ''} ${column.cellClassGetter ? column.cellClassGetter(row, index) : ''}`.trim()}
								>
									{#if cellComponent && cellComponent.component}
										{@const Component = cellComponent.component}
										<Component {...cellComponent.props ?? {}} />
									{:else}
										<span
											class="block max-w-full min-w-0 truncate"
											data-overflow-marquee
											>{getCellValue(row, column, index)}</span
										>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</WashTableBody>
		</WashTable>
	</div>

	<!-- Design DataTableFooterBar -->
	<div
		class="border-base-300 bg-base-100 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-t px-3 py-2"
	>
		<div
			class="flex min-w-0 flex-wrap items-center justify-start justify-self-start gap-2"
		>
			<label class="text-ink-muted flex items-center gap-1.5 text-xs">
				<span class="whitespace-nowrap">Per page</span>
				<WashSelect
					className="select select-sm select-bordered w-auto min-w-[4.5rem] cursor-pointer"
					bind:value={pageSize}
					onChange={handlePageSizeChange}
					disabled={isLoading}
				>
					{#each pageSizeOptions as size (size)}
						<option value={String(size)}>{size}</option>
					{/each}
				</WashSelect>
			</label>
			<div class="hidden xl:block">
				<div class="join">
					<button
						class="btn btn-sm join-item"
						type="button"
						onclick={() => goToPage(currentPage - 1)}
						disabled={currentPage <= 1 || isLoading}
						aria-label="Previous page"
					>
						<LucideChevronLeft className="size-4" />
					</button>
					{#each getVisiblePages() as item, i (item.type === 'page' ? `page-${item.page}` : `ellipsis-${i}`)}
						{#if item.type === 'page'}
							<button
								class="btn join-item btn-sm {item.page === currentPage
									? 'btn-active'
									: ''}"
								type="button"
								onclick={() => item.page && goToPage(item.page)}
							>
								{item.page}
							</button>
						{:else}
							<button
								class="btn join-item btn-sm btn-disabled"
								type="button"
								disabled
							>
								…
							</button>
						{/if}
					{/each}
					<button
						class="btn btn-sm join-item"
						type="button"
						onclick={() => goToPage(currentPage + 1)}
						disabled={currentPage >= totalPages || isLoading}
						aria-label="Next page"
					>
						<LucideChevronRight className="size-4" />
					</button>
				</div>
			</div>
		</div>

		<div class="justify-self-center">
			<div class="flex justify-center xl:hidden">
				<div class="join">
					<button
						class="btn btn-sm join-item"
						type="button"
						onclick={() => goToPage(currentPage - 1)}
						disabled={currentPage <= 1 || isLoading}
						aria-label="Previous page"
					>
						<LucideChevronLeft className="size-4" />
					</button>
					{#each getVisiblePages() as item, i (item.type === 'page' ? `page-m-${item.page}` : `ellipsis-m-${i}`)}
						{#if item.type === 'page'}
							<button
								class="btn join-item btn-sm {item.page === currentPage
									? 'btn-active'
									: ''}"
								type="button"
								onclick={() => item.page && goToPage(item.page)}
							>
								{item.page}
							</button>
						{:else}
							<button
								class="btn join-item btn-sm btn-disabled"
								type="button"
								disabled
							>
								…
							</button>
						{/if}
					{/each}
					<button
						class="btn btn-sm join-item"
						type="button"
						onclick={() => goToPage(currentPage + 1)}
						disabled={currentPage >= totalPages || isLoading}
						aria-label="Next page"
					>
						<LucideChevronRight className="size-4" />
					</button>
				</div>
			</div>
			<p
				class="text-ink-muted hidden text-center font-mono text-xs xl:block"
			>
				{showingSummary}
			</p>
		</div>

		<div
			class="flex min-w-0 flex-wrap items-center justify-end justify-self-end gap-2"
		>
			{#if exportEnabled && exportConfig}
				<MenziesTableExportToolbar
					columns={exportConfig.columns}
					title={exportConfig.title}
					subtitle={exportConfig.subtitle}
					filenameStem={exportConfig.filenameStem}
					formats={exportConfig.formats}
					disabled={isLoading || rows.length === 0}
					getRows={resolveExportRows}
				/>
			{/if}

			<div class="flex shrink-0 items-center gap-1">
				{#if showRefreshButton}
					<WashTooltip
						tooltipText={refreshTooltip}
						className="tooltip-secondary"
					>
						<WashButton
							type="button"
							variant="ghost"
							size="sm"
							square={true}
							className="btn-secondary cursor-pointer"
							onClick={handleRefresh}
							disabled={isLoading}
							loading={isLoading}
							loadingText=""
							title={refreshTooltip}
						>
							<LucideRefreshCcw className="size-4" />
						</WashButton>
					</WashTooltip>
				{/if}

				{#if addAction}
					{@render addAction()}
				{:else if showAddButton}
					<WashTooltip tooltipText={addLabel} className="tooltip-primary">
						<WashButton
							type="button"
							variant="ghost"
							size="sm"
							square={true}
							className="btn-primary cursor-pointer"
							onClick={handleAdd}
							disabled={isLoading || addDisabled}
						>
							<LucidePlus className="size-4" />
						</WashButton>
					</WashTooltip>
				{/if}
			</div>
		</div>
	</div>

	{#if legendItems.length > 0}
		<!-- Design DataTableLegendsRow -->
		<div
			class="border-base-300 bg-base-100 flex shrink-0 flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t px-3 pt-3 pb-2"
		>
			{#if legendTitle?.trim()}
				<span class="text-ink-muted text-xs font-semibold"
					>{legendTitle}</span
				>
			{/if}
			<ul
				class="m-0 flex list-none flex-wrap items-center justify-center gap-x-6 gap-y-1.5 p-0"
			>
				{#each legendItems as legend (legend.id)}
					<li class="text-base-content flex items-center gap-2 text-xs">
						<span
							class={`inline-block size-2.5 shrink-0 rounded-full ${legend.colorClass}`.trim()}
							aria-hidden="true"
						></span>
						<span>{legend.label}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
