<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	const visitIdStr = $derived(page.url.searchParams.get('visitId') ?? '');
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);

	type ObservationRow = {
		id: number;
		dateTime: string;
		value: string;
		unit: string;
		remark: string;
	};

	const defaultColumns: MariTableColumn<ObservationRow>[] = [
		{ id: 'dateTime', header: 'Date / Time', widthClass: 'w-36', filterable: false },
		{ id: 'value', header: 'Value', widthClass: 'w-24', filterable: false },
		{ id: 'unit', header: 'Unit', widthClass: 'w-20', filterable: false },
		{ id: 'remark', header: 'Remark', widthClass: 'w-40', filterable: false }
	];

	type CardDef = {
		key: string;
		title: string;
		columns: MariTableColumn<ObservationRow>[];
		rows: ObservationRow[];
	};

	const cards: CardDef[] = [
		{ key: 'vitals', title: 'Vitals', columns: defaultColumns, rows: [] },
		{ key: 'intake', title: 'Intake', columns: defaultColumns, rows: [] },
		{ key: 'output', title: 'Output', columns: defaultColumns, rows: [] },
		{ key: 'blood-sugar', title: 'Blood Sugar', columns: defaultColumns, rows: [] },
		{ key: 'pain-score', title: 'Pain Score', columns: defaultColumns, rows: [] },
		{ key: 'gcs', title: 'GCS', columns: defaultColumns, rows: [] },
		{ key: 'neurological', title: 'Neurological', columns: defaultColumns, rows: [] },
		{ key: 'ventilator', title: 'Ventilator', columns: defaultColumns, rows: [] },
		{ key: 'others', title: 'Others', columns: defaultColumns, rows: [] }
	];

	function handleAdd(key: string) {
		// TODO: open add dialog for this observation type
	}
	function handleEdit(key: string) {
		// TODO: open edit dialog for selected row
	}
	function handleDelete(key: string) {
		// TODO: confirm & delete selected row
	}
</script>

<svelte:head>
	<title>Observation EMR</title>
</svelte:head>

<div class="flex flex-col gap-4">
	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message="Choose a visit using the 'Choose Visit' button above to view observation data."
			className="z-0"
		/>
	{:else}
		<div class="observation-bento-grid">
			{#each cards as card (card.key)}
				<DaisyUiCard className="observation-bento-card">
					<DaisyUiCardBody className="gap-3 p-4">
						<DaisyUiCardBodyTitle
							className="flex items-center justify-between"
						>
							<span class="text-sm font-semibold">{card.title}</span>
							<div class="flex items-center gap-1">
								<DaisyUiTooltip tooltipText="Add" className="d-tooltip-bottom">
									<DaisyUiButton
										className="d-btn-ghost d-btn-xs d-btn-square"
										onClick={() => handleAdd(card.key)}
									>
										<LucidePlus className="size-3.5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
								<DaisyUiTooltip tooltipText="Edit" className="d-tooltip-bottom">
									<DaisyUiButton
										className="d-btn-ghost d-btn-xs d-btn-square"
										onClick={() => handleEdit(card.key)}
									>
										<LucidePencil className="size-3.5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
								<DaisyUiTooltip tooltipText="Delete" className="d-tooltip-bottom">
									<DaisyUiButton
										className="d-btn-ghost d-btn-xs d-btn-square text-error"
										onClick={() => handleDelete(card.key)}
									>
										<LucideTrash2 className="size-3.5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
							</div>
						</DaisyUiCardBodyTitle>

						<div class="observation-table-wrap">
							<MariTable
								rows={card.rows}
								columns={card.columns}
								isLoading={false}
								showRefreshButton={false}
								emptyMessage="No records."
								enableColumnFilters={false}
							/>
						</div>
					</DaisyUiCardBody>
				</DaisyUiCard>
			{/each}
		</div>
	{/if}
</div>

<style>
	.observation-bento-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr;
	}

	@media (min-width: 768px) {
		.observation-bento-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.observation-bento-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	:global(.observation-bento-card) {
		min-height: 16rem;
	}

	.observation-table-wrap {
		overflow: auto;
		max-height: 14rem;
		min-height: 0;
	}
</style>
