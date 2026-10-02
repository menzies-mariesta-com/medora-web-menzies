<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import MenziesTable, {
		type MenziesTableColumnsInput
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { m } from '$lib/paraglide/messages';

	let {
		confirm,
		title,
		isLoading = false,
		columns,
		rows,
		pageSize = String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)
	} = $props<
		DialogSlotProps & {
			title: string;
			isLoading?: boolean;
			columns: MenziesTableColumnsInput;
			rows: unknown[];
			pageSize?: string;
		}
	>();

	let pickerPage = $state(1);

	function handleSelect(row: unknown) {
		void confirm(row);
	}
</script>

<div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
	<MenziesTable
		{title}
		bind:currentPage={pickerPage}
		{columns}
		{rows}
		{isLoading}
		{pageSize}
		fillParent={true}
		embedded={true}
		showRefreshButton={false}
		showRowActions={true}
		actionsVariant="none"
		actionsHeader={m.inv_common_btn_select()}
		enableColumnFilters={false}
	>
		{#snippet rowActions(row, _index)}
			<WashTooltip
				tooltipText={m.inv_common_btn_select()}
				className="tooltip-primary"
			>
				<WashButton
					type="button"
					className="btn-primary btn-sm btn-ghost"
					onClick={() => handleSelect(row)}
				>
					<LucideCircleCheck className="size-3.5" />
				</WashButton>
			</WashTooltip>
		{/snippet}
	</MenziesTable>
</div>
