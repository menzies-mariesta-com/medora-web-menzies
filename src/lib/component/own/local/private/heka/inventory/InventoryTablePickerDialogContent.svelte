<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import MariTable, {
		type MariTableColumnsInput
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { m } from '$lib/paraglide/messages';

	let {
		confirm,
		cancel,
		title,
		isLoading = false,
		columns,
		rows,
		pageSize = String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)
	} = $props<
		DialogSlotProps & {
			title: string;
			isLoading?: boolean;
			columns: MariTableColumnsInput;
			rows: unknown[];
			pageSize?: string;
		}
	>();

	let pickerPage = $state(1);

	function handleSelect(row: unknown) {
		void confirm(row);
	}
</script>

<div
	class="flex h-full min-h-0 flex-col gap-0 overflow-hidden p-4 sm:p-6"
>
	<div
		class="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 pb-3"
	>
		<h3 class="text-lg font-bold">{title}</h3>
		<DaisyUiButton type="button" className="d-btn-sm" onClick={() => cancel()}>
			{m.cancel()}
		</DaisyUiButton>
	</div>
	<div class="flex min-h-0 flex-1 flex-col pt-3">
		<MariTable
			bind:currentPage={pickerPage}
			{columns}
			{rows}
			{isLoading}
			{pageSize}
			fillParent={true}
			showRefreshButton={false}
			showRowActions={true}
			actionsVariant="none"
			actionsHeader={m.inv_common_btn_select()}
			enableColumnFilters={false}
		>
			{#snippet rowActions(row, _index)}
				<DaisyUiTooltip
					tooltipText={m.inv_common_btn_select()}
					className="d-tooltip-primary d-tooltip-right"
				>
					<DaisyUiButton
						type="button"
						className="d-btn-primary d-btn-sm d-btn-ghost"
						onClick={() => handleSelect(row)}
					>
						<LucideCircleCheck className="size-5" />
					</DaisyUiButton>
				</DaisyUiTooltip>
			{/snippet}
		</MariTable>
	</div>
</div>
