<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';

	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';

	type Row = any;

	const dispatch = createEventDispatcher<{
		add: void;
		refresh: void;
		view: Row;
		edit: Row;
		delete: Row;
		pageChange: number;
		pageSizeChange: number;
		filtersChange: {
			columnId: string;
			value: string;
			filters: Record<string, string>;
		};
	}>();

	let {
		title,
		rows = [],
		columns = [],
		emptyMessage = 'No records.',
		isLoading = false,
		showRefreshButton = false,
		columnFilters = $bindable<Record<string, string>>({}),
		pageSizeOptions,
		pageSize = $bindable('10'),
		currentPage = $bindable(1),
		totalRowCount,
		useRemoteFilters = false,
		enableColumnFilters = false,
		crudShowView = true,
		rowActionsVariant = 'crud',
		showRowActions = true,
		cardClassName = '',
		tableWrapClassName = 'max-h-72 min-h-0',
		addButtonVariant = 'add',
		redirectHref = '',
		redirectButtonText = ''
	} = $props<{
		title: string;
		rows?: Row[];
		columns?: MariTableColumn<Row>[];
		emptyMessage?: string;
		isLoading?: boolean;
		showRefreshButton?: boolean;
		pageSizeOptions?: number[];
		pageSize?: string;
		currentPage?: number;
		totalRowCount?: number;
		useRemoteFilters?: boolean;
		enableColumnFilters?: boolean;
		crudShowView?: boolean;
		showRowActions?: boolean;
		/**
		 * Controls which row action icons are shown.
		 * - "crud": view/edit/delete buttons (MariTable default)
		 * - "view": eye icon only (custom slot rendering)
		 */
		rowActionsVariant?: 'crud' | 'view';
		addButtonVariant?: 'add' | 'redirect';
		/** Used when `addButtonVariant === 'redirect'`. */
		redirectHref?: string;
		/**
		 * Used when `addButtonVariant === 'redirect'`.
		 * If empty, falls back to `title`.
		 */
		redirectButtonText?: string;
		/** Extra classes on the outer card (e.g. grid column span). */
		cardClassName?: string;
		/** Classes on the table wrapper (e.g. max-height + overflow). */
		tableWrapClassName?: string;
		columnFilters?: Record<string, string>;
	}>();

	function handleAdd() {
		dispatch('add');
	}

	function handleRedirect() {
		if (!redirectHref) return;
		void goto(redirectHref);
	}
</script>

<DaisyUiCard
	className={`observation-bento-card flex min-h-0 min-w-0 max-w-full flex-col${cardClassName ? ` ${cardClassName}` : ''}`}
>
	<DaisyUiCardBody
		className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-3 p-4"
	>
		<DaisyUiCardBodyTitle
			className="flex shrink-0 items-center justify-between"
		>
			<span class="text-sm font-semibold">{title}</span>
			{#if addButtonVariant === 'add'}
				<DaisyUiTooltip tooltipText="Add" className="d-tooltip-bottom">
					<DaisyUiButton
						className="d-btn-ghost d-btn-xs d-btn-square"
						onClick={handleAdd}
					>
						<LucidePlus className="size-3.5" />
					</DaisyUiButton>
				</DaisyUiTooltip>
			{:else if addButtonVariant === 'redirect'}
				<DaisyUiButton
					className="d-btn-outline d-btn-xs"
					onClick={handleRedirect}
					disabled={!redirectHref}
				>
					{redirectButtonText || title}
				</DaisyUiButton>
			{/if}
		</DaisyUiCardBodyTitle>

		<div
			class="observation-table-wrap flex min-h-0 max-w-full min-w-0 flex-1 flex-col{tableWrapClassName
				? ` ${tableWrapClassName}`
				: ''}"
		>
			<MariTable
				fillParent={true}
				{rows}
				{columns}
				{isLoading}
				{emptyMessage}
				{showRefreshButton}
				bind:columnFilters
				showRowActions={showRowActions}
				actionsVariant={
					showRowActions
						? rowActionsVariant === 'crud'
							? 'crud'
							: 'none'
						: 'none'
				}
				{enableColumnFilters}
				{useRemoteFilters}
				{crudShowView}
				{pageSizeOptions}
				{pageSize}
				{currentPage}
				{totalRowCount}
				on:view={(event) => dispatch('view', event.detail)}
				on:edit={(event) => dispatch('edit', event.detail)}
				on:delete={(event) => dispatch('delete', event.detail)}
				on:pageChange={(event) =>
					dispatch('pageChange', event.detail)}
				on:pageSizeChange={(event) =>
					dispatch('pageSizeChange', event.detail)}
				on:filtersChange={(event) =>
					dispatch('filtersChange', event.detail)}
				on:refresh={() => dispatch('refresh')}
			>
				<svelte:fragment slot="rowActions" let:row>
					{#if showRowActions && rowActionsVariant === 'view'}
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							onClick={() => dispatch('view', row)}
						>
							<LucideEye className="size-4" />
						</DaisyUiButton>
					{/if}
				</svelte:fragment>
			</MariTable>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>
