<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import ObservationCardTable from '$lib/component/global/private/heka/observation/ObservationCardTable.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);

	type ObservationRow = {
		id: number;
		dateTime: string;
		value: string;
		unit: string;
		remark: string;
	};

	const defaultColumns: MariTableColumn<ObservationRow>[] = [
		{
			id: 'dateTime',
			header: 'Date / Time',
			widthClass: 'w-36',
			filterable: false
		},
		{
			id: 'value',
			header: 'Value',
			widthClass: 'w-24',
			filterable: false
		},
		{
			id: 'unit',
			header: 'Unit',
			widthClass: 'w-20',
			filterable: false
		},
		{
			id: 'remark',
			header: 'Remark',
			widthClass: 'w-40',
			filterable: false
		}
	];

	type CardDef = {
		key: string;
		title: string;
		columns: MariTableColumn<ObservationRow>[];
		rows: ObservationRow[];
	};

	const cards: CardDef[] = [
		{
			key: 'vitals',
			title: 'Vitals',
			columns: defaultColumns,
			rows: []
		},
		{
			key: 'intake',
			title: 'Intake',
			columns: defaultColumns,
			rows: []
		},
		{
			key: 'output',
			title: 'Output',
			columns: defaultColumns,
			rows: []
		},
		{
			key: 'blood-sugar',
			title: 'Blood Sugar',
			columns: defaultColumns,
			rows: []
		},
		{
			key: 'pain-score',
			title: 'Pain Score',
			columns: defaultColumns,
			rows: []
		},
		{ key: 'gcs', title: 'GCS', columns: defaultColumns, rows: [] },
		{
			key: 'neurological',
			title: 'Neurological',
			columns: defaultColumns,
			rows: []
		},
		{
			key: 'ventilator',
			title: 'Ventilator',
			columns: defaultColumns,
			rows: []
		},
		{
			key: 'others',
			title: 'Others',
			columns: defaultColumns,
			rows: []
		}
	];

	function handleAdd(key: string) {
		// TODO: open add dialog for this observation type
	}
	function handleEdit(key: string, row: ObservationRow) {
		// TODO: open edit dialog for selected row
	}
	function handleDelete(key: string, row: ObservationRow) {
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
				<ObservationCardTable
					title={card.title}
					rows={card.rows}
					columns={card.columns}
					on:add={() => handleAdd(card.key)}
					on:edit={(event) => handleEdit(card.key, event.detail)}
					on:delete={(event) => handleDelete(card.key, event.detail)}
				/>
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
</style>
