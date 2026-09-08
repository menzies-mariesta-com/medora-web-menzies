<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import MariTable, {
		type MariTableColumnsInput
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import MariTableIconAction from '$lib/component/own/library/mari/table/MariTableIconAction.svelte';
	import MariTableRowActionGroup from '$lib/component/own/library/mari/table/MariTableRowActionGroup.svelte';
	import { m } from '$lib/paraglide/messages';

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
		crudDeleteDisabled,
		masterFilterHospitalId
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
		masterFilterHospitalId?: string;
	}>();

	function handleAdd() {
		dispatch('add');
	}

	function handleRedirect() {
		if (!redirectHref) return;
		void goto(resolve(redirectHref));
	}
</script>

<WashCard
	className={`observation-bento-card flex min-h-0 min-w-0 max-w-full flex-col${cardClassName ? ` ${cardClassName}` : ''}`}
>
	<WashCardBody
		className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-3 p-4"
	>
		<WashCardBodyTitle
			className="flex shrink-0 items-center justify-between"
		>
			<span class="text-sm font-semibold">{title}</span>
			{#if addButtonVariant === 'add'}
				<WashTooltip
					tooltipText="Add"
					className=""
				>
					<WashButton
						className="btn-ghost btn-xs btn-square"
						onClick={handleAdd}
					>
						<LucidePlus className="size-3.5" />
					</WashButton>
				</WashTooltip>
			{:else if addButtonVariant === 'redirect'}
				<WashTooltip
					tooltipText={redirectButtonText || title}
					className=""
				>
					<WashButton
						className="btn-ghost btn-xs btn-square"
						onClick={handleRedirect}
						disabled={!redirectHref}
					>
						<LucidePlus className="size-3.5" />
					</WashButton>
				</WashTooltip>
			{/if}
		</WashCardBodyTitle>

		<div
			class="observation-table-wrap flex min-h-0 max-w-full min-w-0 flex-1 flex-col{tableWrapClassName
				? ` ${tableWrapClassName}`
				: ''}"
		>
			<MariTable
				fillParent={true}
				{rows}
				{columns}
				{masterFilterHospitalId}
				{isLoading}
				{emptyMessage}
				{showRefreshButton}
				bind:columnFilters
				{crudEditDisabled}
				{crudDeleteDisabled}
				{showRowActions}
				actionsVariant={enableMoveAction
					? 'none'
					: showRowActions
						? rowActionsVariant === 'crud'
							? 'crud'
							: 'none'
						: 'none'}
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
						<MariTableRowActionGroup>
							{#if crudShowView}
								<MariTableIconAction
									tooltipText={m.mari_table_tooltip_view()}
									color="ghost"
									onClick={() => dispatch('view', row)}
								>
									{#snippet icon()}
										<LucideEye className="size-4" />
									{/snippet}
								</MariTableIconAction>
							{/if}
							<MariTableIconAction
								tooltipText={m.mari_table_tooltip_edit()}
								color="accent"
								disabled={crudEditDisabled?.(row) ?? false}
								onClick={() => dispatch('edit', row)}
							>
								{#snippet icon()}
									<LucidePencil className="size-4" />
								{/snippet}
							</MariTableIconAction>
							<MariTableIconAction
								tooltipText={m.mari_table_crud_inactivate_tooltip()}
								color="error"
								disabled={crudDeleteDisabled?.(row) ?? false}
								onClick={() => dispatch('delete', row)}
							>
								{#snippet icon()}
									<LucideTrash2 className="size-4" />
								{/snippet}
							</MariTableIconAction>
							<MariTableIconAction
								tooltipText={`move to ${moveToLabel || ''}`.trim()}
								color="info"
								disabled={!moveToFormCode}
								onClick={() =>
									dispatch('move', {
										row,
										toFormCode: moveToFormCode
									})}
							>
								{#snippet icon()}
									{#if moveDirection === 'up'}
										<LucideChevronLeft className="size-4" />
									{:else}
										<LucideChevronRight className="size-4" />
									{/if}
								{/snippet}
							</MariTableIconAction>
						</MariTableRowActionGroup>
					{:else if showRowActions && rowActionsVariant === 'view'}
						<MariTableIconAction
							tooltipText={m.mari_table_tooltip_view()}
							color="ghost"
							onClick={() => dispatch('view', row)}
						>
							{#snippet icon()}
								<LucideEye className="size-4" />
							{/snippet}
						</MariTableIconAction>
					{/if}
				{/snippet}
			</MariTable>
		</div>
	</WashCardBody>
</WashCard>
