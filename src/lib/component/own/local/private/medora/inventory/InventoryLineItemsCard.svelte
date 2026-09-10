<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MenziesTable from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		hideTitle?: boolean;
		addButtonIconOnly?: boolean;
		/** When true, parent renders the add control (toolbar row may still show title/filter). */
		hideAddButton?: boolean;
		/** When true, omit WashCard wrapper (table only layout). */
		noCard?: boolean;
		/** Optional extra controls rendered at the far right of the header row. */
		toolbarRight?: Snippet<[]>;
		lineItemFilter?: string;
		/** If true, hides the external quick-filter input and enables MenziesTable header column filters. */
		useColumnFilters?: boolean;
		/** Hides the external quick-filter input without enabling column filters. */
		hideQuickFilter?: boolean;
		totalCount: number;
		columns: unknown[];
		rows: unknown[];
		viewOnly?: boolean;
		showCloseLine?: boolean;
		isCloseableFn?: ((row: any) => boolean) | null;
		onCloseLine?: ((row: any) => void) | null;
		onAddItem: () => void;
		onEditLine: (row: any) => void;
		onDeleteLine: (key: string) => void;
	};

	let {
		title,
		hideTitle = false,
		addButtonIconOnly = false,
		hideAddButton = false,
		noCard = false,
		toolbarRight,
		lineItemFilter = $bindable(''),
		useColumnFilters = false,
		hideQuickFilter = false,
		totalCount,
		columns,
		rows,
		viewOnly = false,
		showCloseLine = false,
		isCloseableFn = null,
		onCloseLine = null,
		onAddItem,
		onEditLine,
		onDeleteLine
	}: Props = $props();

	const shouldHideQuickFilter = $derived(
		hideQuickFilter || useColumnFilters
	);

	const showCardToolbar = $derived(
		!hideTitle ||
			!shouldHideQuickFilter ||
			(!viewOnly && !hideAddButton) ||
			toolbarRight != null
	);

	const footerBorderClass = $derived(
		noCard ? 'border-base-300' : 'border-base-200'
	);

	const toolbarJustifyClass = $derived(
		hideTitle ? 'sm:justify-end' : 'sm:justify-between'
	);
</script>

{#snippet inner()}
	{#if showCardToolbar}
		<div
			class="flex flex-col gap-3 sm:flex-row sm:items-center {toolbarJustifyClass}"
		>
			{#if !hideTitle}
				<WashCardBodyTitle className="text-base"
					>{title}</WashCardBodyTitle
				>
			{/if}
			<div
				class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
			>
				{#if !shouldHideQuickFilter}
					<input
						type="text"
						class="input-bordered input w-full sm:w-56"
						placeholder={m.inv_line_items_filter_placeholder()}
						bind:value={lineItemFilter}
						aria-label={m.inv_line_items_filter_aria()}
					/>
				{/if}
				{#if !viewOnly && !hideAddButton}
					{#if addButtonIconOnly}
						<WashTooltip
							tooltipText={m.inv_line_items_add()}
							className="tooltip-ghost"
						>
							<WashButton
								className="btn-primary btn-square btn-sm"
								type="button"
								title={m.inv_line_items_add()}
								onClick={() => onAddItem()}
							>
								<LucidePlus className="size-4" />
							</WashButton>
						</WashTooltip>
					{:else}
						<WashButton
							className="btn-primary"
							type="button"
							onClick={() => onAddItem()}
						>
							<LucidePlus className="size-4" />
							{m.inv_line_items_add()}
						</WashButton>
					{/if}
				{/if}
				{#if toolbarRight}
					{@render toolbarRight()}
				{/if}
			</div>
		</div>
	{/if}

	<div class="h-[420px] min-h-0">
		<MenziesTable
			columns={columns as any[]}
			rows={rows as any[]}
			isLoading={false}
			showRowActions={true}
			actionsVariant="none"
			showRefreshButton={false}
			enableColumnFilters={useColumnFilters}
		>
			{#snippet rowActions(row)}
				<MenziesTableRowActionGroup>
					{#if showCloseLine && onCloseLine && (isCloseableFn ? isCloseableFn(row) : true)}
						<MenziesTableIconAction
							tooltipText={m.inv_line_items_tooltip_close_line()}
							color="warning"
							onClick={() => onCloseLine?.(row)}
						>
							{#snippet icon()}
								<LucideX className="size-3.5" />
							{/snippet}
						</MenziesTableIconAction>
					{/if}
					<MenziesTableIconAction
						tooltipText={m.inv_line_items_tooltip_edit()}
						color="accent"
						disabled={viewOnly}
						onClick={() => onEditLine(row)}
					>
						{#snippet icon()}
							<LucidePencil className="size-3.5" />
						{/snippet}
					</MenziesTableIconAction>
					<MenziesTableIconAction
						tooltipText={m.inv_line_items_tooltip_delete()}
						color="error"
						disabled={viewOnly}
						onClick={() => onDeleteLine((row as { key: string }).key)}
					>
						{#snippet icon()}
							<LucideTrash2 className="size-3.5" />
						{/snippet}
					</MenziesTableIconAction>
				</MenziesTableRowActionGroup>
			{/snippet}
		</MenziesTable>
	</div>

	<div
		class="flex flex-wrap items-center justify-between gap-3 border-t pt-4 {footerBorderClass}"
	>
		<div class="text-sm opacity-80">
			{m.inv_line_items_total_prefix()}
			<span class="font-semibold">{totalCount}</span>
		</div>
	</div>
{/snippet}

{#if noCard}
	<div class="flex min-w-0 flex-col gap-4">
		{@render inner()}
	</div>
{:else}
	<WashCard>
		<WashCardBody className="gap-4">
			{@render inner()}
		</WashCardBody>
	</WashCard>
{/if}
