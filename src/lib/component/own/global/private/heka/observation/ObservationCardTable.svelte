<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import MariTable, { type MariTableColumnsInput } from '$lib/component/own/library/mari/table/MariTable.svelte';

	/** Event payloads; matches MariTable’s untyped row wire-up. */
	type Row = any;

	const dispatch = createEventDispatcher<{
		add: void;
		refresh: void;
		view: Row;
		edit: Row;
		delete: Row;
		move: {
			row: Row;
			toFormCode: string;
		};
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
		redirectButtonText = '',
		enableMoveAction = false,
		moveToLabel = '',
		moveToFormCode = '',
		moveDirection = 'down',
		crudEditDisabled,
		crudDeleteDisabled
	} = $props<{
		title: string;
		rows?: unknown[];
		columns?: MariTableColumnsInput;
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
		addButtonVariant?: 'add' | 'redirect' | 'none';
		/** Used when `addButtonVariant === 'redirect'`. */
		redirectHref?: string;
		/**
		 * Used when `addButtonVariant === 'redirect'`.
		 * If empty, falls back to `title`.
		 */
		redirectButtonText?: string;
		/** When enabled, adds a move icon to the actions column (and renders custom edit/delete too). */
		enableMoveAction?: boolean;
		/** Tooltip text: `move to {moveToLabel}` */
		moveToLabel?: string;
		/** Target form code to pass back in the `move` event. */
		moveToFormCode?: string;
		/** Controls whether we use an up or down move icon. */
		moveDirection?: 'up' | 'down';
		/** Extra classes on the outer card (e.g. grid column span). */
		cardClassName?: string;
		/** Classes on the table wrapper (e.g. max-height + overflow). */
		tableWrapClassName?: string;
		columnFilters?: Record<string, string>;
		crudEditDisabled?: (row: Row) => boolean;
		crudDeleteDisabled?: (row: Row) => boolean;
	}>();

	function handleAdd() {
		dispatch('add');
	}

	function handleRedirect() {
		if (!redirectHref) return;
		void goto(resolve(redirectHref));
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
				<DaisyUiTooltip
					tooltipText={redirectButtonText || title}
					className="d-tooltip-bottom"
				>
					<DaisyUiButton
						className="d-btn-ghost d-btn-xs d-btn-square"
						onClick={handleRedirect}
						disabled={!redirectHref}
					>
						<LucidePlus className="size-3.5" />
					</DaisyUiButton>
				</DaisyUiTooltip>
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
				{crudEditDisabled}
				{crudDeleteDisabled}
				showRowActions={showRowActions}
				actionsVariant={
					enableMoveAction
						? 'none'
						: showRowActions
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
				{#snippet rowActions(row)}
					{#if enableMoveAction}
						<div class="flex items-center gap-2">
							{#if crudShowView}
								<DaisyUiButton
									className="d-btn-ghost d-btn-sm"
									onClick={() => dispatch('view', row)}
								>
									<LucideEye className="size-4" />
								</DaisyUiButton>
							{/if}

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

							<DaisyUiTooltip
								tooltipText={`move to ${moveToLabel || ''}`.trim()}
								className="d-tooltip-bottom"
							>
								<DaisyUiButton
									className="d-btn-ghost d-btn-sm"
									disabled={!moveToFormCode}
									onClick={() =>
										dispatch('move', {
											row,
											toFormCode: moveToFormCode
										})
									}
								>
									{#if moveDirection === 'up'}
										<LucideChevronLeft className="size-4" />
									{:else}
										<LucideChevronRight className="size-4" />
									{/if}
								</DaisyUiButton>
							</DaisyUiTooltip>
						</div>
					{:else if showRowActions && rowActionsVariant === 'view'}
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							onClick={() => dispatch('view', row)}
						>
							<LucideEye className="size-4" />
						</DaisyUiButton>
					{/if}
				{/snippet}
			</MariTable>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>
