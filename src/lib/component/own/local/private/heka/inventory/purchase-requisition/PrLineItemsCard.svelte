<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MariTable from '$lib/component/own/library/mari/table/MariTable.svelte';

	export let viewOnly: boolean;
	export let lineItemFilter: string;
	export let createLinesCount: number;
	export let columns: any[];
	export let rows: any[];

	export let onAddItem: () => void;
	export let onEditLine: (row: any) => void;
	export let onDeleteLine: (key: string) => void;
</script>

<DaisyUiCard>
	<DaisyUiCardBody className="gap-4">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<DaisyUiCardBodyTitle className="text-base">Line Items</DaisyUiCardBodyTitle>
			<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
				<input
					type="text"
					class="d-input d-input-bordered w-full sm:w-56"
					placeholder="Filter line items..."
					bind:value={lineItemFilter}
					aria-label="Filter line items"
				/>
				{#if !viewOnly}
					<DaisyUiButton className="d-btn-primary" type="button" onClick={() => onAddItem()}>
						<LucidePlus className="size-4" />
						Add Item
					</DaisyUiButton>
				{/if}
			</div>
		</div>

		<div class="h-[420px]">
			<MariTable
				columns={columns}
				rows={rows}
				isLoading={false}
				showRowActions={true}
				actionsVariant="none"
				showRefreshButton={false}
				enableColumnFilters={false}
			>
				{#snippet rowActions(row)}
					<div class="flex flex-col items-center gap-1">
						<DaisyUiTooltip tooltipText="Edit" className="d-tooltip-accent d-tooltip-right">
							<DaisyUiButton
								type="button"
								className="d-btn-sm d-btn-ghost d-btn-accent"
								disabled={viewOnly}
								onClick={() => onEditLine(row)}
							>
								<LucidePencil className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
						<DaisyUiTooltip tooltipText="Delete" className="d-tooltip-error d-tooltip-right">
							<DaisyUiButton
								type="button"
								className="d-btn-ghost d-btn-sm d-btn-error"
								disabled={viewOnly}
								onClick={() => onDeleteLine(row.key)}
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
				Total items: <span class="font-semibold">{createLinesCount}</span>
			</div>
			<div class="text-sm opacity-60">Volume: —</div>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>

