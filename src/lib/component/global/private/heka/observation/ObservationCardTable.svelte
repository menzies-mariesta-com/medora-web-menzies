<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';

	type Row = any;

	const dispatch = createEventDispatcher<{
		add: void;
		view: Row;
		edit: Row;
		delete: Row;
		pageChange: number;
		pageSizeChange: number;
	}>();

	let {
		title,
		rows = [],
		columns = [],
		emptyMessage = 'No records.',
		isLoading = false,
		pageSizeOptions,
		pageSize,
		currentPage,
		totalRowCount,
		useRemoteFilters = false,
		enableColumnFilters = false
	} = $props<{
		title: string;
		rows?: Row[];
		columns?: MariTableColumn<Row>[];
		emptyMessage?: string;
		isLoading?: boolean;
		pageSizeOptions?: number[];
		pageSize?: string;
		currentPage?: number;
		totalRowCount?: number;
		useRemoteFilters?: boolean;
		enableColumnFilters?: boolean;
	}>();

	function handleAdd() {
		dispatch('add');
	}
</script>

<DaisyUiCard className="observation-bento-card">
	<DaisyUiCardBody className="gap-3 p-4">
		<DaisyUiCardBodyTitle className="flex items-center justify-between">
			<span class="text-sm font-semibold">{title}</span>
			<DaisyUiTooltip tooltipText="Add" className="d-tooltip-bottom">
				<DaisyUiButton
					className="d-btn-ghost d-btn-xs d-btn-square"
					onClick={handleAdd}
				>
					<LucidePlus className="size-3.5" />
				</DaisyUiButton>
			</DaisyUiTooltip>
		</DaisyUiCardBodyTitle>

		<div class="observation-table-wrap">
			<MariTable
				rows={rows}
				columns={columns}
				isLoading={isLoading}
				emptyMessage={emptyMessage}
				showRefreshButton={false}
				showRowActions={true}
				actionsVariant="crud"
				enableColumnFilters={enableColumnFilters}
				useRemoteFilters={useRemoteFilters}
				{pageSizeOptions}
				{pageSize}
				{currentPage}
				{totalRowCount}
				on:view={(event) => dispatch('view', event.detail)}
				on:edit={(event) => dispatch('edit', event.detail)}
				on:delete={(event) => dispatch('delete', event.detail)}
				on:pageChange={(event) => dispatch('pageChange', event.detail)}
				on:pageSizeChange={(event) =>
					dispatch('pageSizeChange', event.detail)}
			/>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>

