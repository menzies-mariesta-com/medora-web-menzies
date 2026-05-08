<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- MariTable rows/columns and action callbacks are page-typed */
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

	export let title: string;
	export let lineItemFilter: string;
	export let totalCount: number;
	export let columns: unknown[];
	export let rows: unknown[];
	export let viewOnly = false;
	export let showCloseLine = false;
	export let isCloseableFn: ((row: any) => boolean) | null = null;
	export let onCloseLine: ((row: any) => void) | null = null;

	export let onAddItem: () => void;
	export let onEditLine: (row: any) => void;
	export let onDeleteLine: (key: string) => void;
</script>

<DaisyUiCard>
	<DaisyUiCardBody className="gap-4">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<DaisyUiCardBodyTitle className="text-base">{title}</DaisyUiCardBodyTitle>
			<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
				<input
					type="text"
					class="d-input d-input-bordered w-full sm:w-56"
					placeholder={m.inv_line_items_filter_placeholder()}
					bind:value={lineItemFilter}
					aria-label={m.inv_line_items_filter_aria()}
				/>
				{#if !viewOnly}
					<DaisyUiButton className="d-btn-primary" type="button" onClick={() => onAddItem()}>
						<LucidePlus className="size-4" />
						{m.inv_line_items_add()}
					</DaisyUiButton>
				{/if}
			</div>
		</div>

		<div class="h-[420px] min-h-0">
			<MariTable
				columns={columns as any[]}
				rows={rows as any[]}
				isLoading={false}
				showRowActions={true}
				actionsVariant="none"
				showRefreshButton={false}
				enableColumnFilters={false}
			>
				{#snippet rowActions(row)}
					<div class="flex flex-col items-center gap-1">
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
								onClick={() => onDeleteLine((row as { key: string }).key)}
							>
								<LucideTrash2 className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					</div>
				{/snippet}
			</MariTable>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 pt-4">
			<div class="text-sm opacity-80">
				{m.inv_line_items_total_prefix()}
				<span class="font-semibold">{totalCount}</span>
			</div>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>
