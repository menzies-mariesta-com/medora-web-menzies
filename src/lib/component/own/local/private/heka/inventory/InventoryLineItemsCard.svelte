<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MariTable from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		hideTitle?: boolean;
		addButtonIconOnly?: boolean;
		/** When true, parent renders the add control (toolbar row may still show title/filter). */
		hideAddButton?: boolean;
		/** When true, omit DaisyUiCard wrapper (table only layout). */
		noCard?: boolean;
		/** Optional extra controls rendered at the far right of the header row. */
		toolbarRight?: Snippet<[]>;
		lineItemFilter?: string;
		/** If true, hides the external quick-filter input and enables MariTable header column filters. */
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
				<DaisyUiCardBodyTitle className="text-base"
					>{title}</DaisyUiCardBodyTitle
				>
			{/if}
			<div
				class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
			>
				{#if !shouldHideQuickFilter}
					<input
						type="text"
						class="d-input-bordered d-input w-full sm:w-56"
						placeholder={m.inv_line_items_filter_placeholder()}
						bind:value={lineItemFilter}
						aria-label={m.inv_line_items_filter_aria()}
					/>
				{/if}
				{#if !viewOnly && !hideAddButton}
					{#if addButtonIconOnly}
						<DaisyUiTooltip
							tooltipText={m.inv_line_items_add()}
							className="d-tooltip-ghost"
						>
							<DaisyUiButton
								className="d-btn-primary d-btn-square d-btn-sm"
								type="button"
								title={m.inv_line_items_add()}
								onClick={() => onAddItem()}
							>
								<LucidePlus className="size-4" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{:else}
						<DaisyUiButton
							className="d-btn-primary"
							type="button"
							onClick={() => onAddItem()}
						>
							<LucidePlus className="size-4" />
							{m.inv_line_items_add()}
						</DaisyUiButton>
					{/if}
				{/if}
				{#if toolbarRight}
					{@render toolbarRight()}
				{/if}
			</div>
		</div>
	{/if}

	<div class="h-[420px] min-h-0">
		<MariTable
			columns={columns as any[]}
			rows={rows as any[]}
			isLoading={false}
			showRowActions={true}
			actionsVariant="none"
			showRefreshButton={false}
			enableColumnFilters={useColumnFilters}
		>
			{#snippet rowActions(row)}
				<div class="flex items-center justify-center gap-1">
					{#if showCloseLine && onCloseLine && (isCloseableFn ? isCloseableFn(row) : true)}
						<DaisyUiTooltip
							tooltipText={m.inv_line_items_tooltip_close_line()}
							className="d-tooltip-warning d-tooltip-right"
						>
							<DaisyUiButton
								type="button"
								className="d-btn-sm d-btn-ghost d-btn-warning"
								onClick={() => onCloseLine?.(row)}
							>
								<LucideX className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}
					<DaisyUiTooltip
						tooltipText={m.inv_line_items_tooltip_edit()}
						className="d-tooltip-accent d-tooltip-right"
					>
						<DaisyUiButton
							type="button"
							className="d-btn-sm d-btn-ghost d-btn-accent"
							disabled={viewOnly}
							onClick={() => onEditLine(row)}
						>
							<LucidePencil className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
					<DaisyUiTooltip
						tooltipText={m.inv_line_items_tooltip_delete()}
						className="d-tooltip-error d-tooltip-right"
					>
						<DaisyUiButton
							type="button"
							className="d-btn-ghost d-btn-sm d-btn-error"
							disabled={viewOnly}
							onClick={() =>
								onDeleteLine((row as { key: string }).key)}
						>
							<LucideTrash2 className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
				</div>
			{/snippet}
		</MariTable>
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
	<DaisyUiCard>
		<DaisyUiCardBody className="gap-4">
			{@render inner()}
		</DaisyUiCardBody>
	</DaisyUiCard>
{/if}
