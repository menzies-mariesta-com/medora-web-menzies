<script lang="ts">
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import LNursingEmrOrderHistoryTable, {
		type NursingEmrOrderHistoryItem
	} from '$lib/component/own/local/private/medora/nursing-workbench/emr/order/LNursingEmrOrderHistoryTable.svelte';

	const { open, onClose, items, isLoading, pageSizeStr, onDelete } =
		$props<{
			open: boolean;
			onClose: () => void;
			items: NursingEmrOrderHistoryItem[];
			isLoading: boolean;
			pageSizeStr: string;
			onDelete: (row: NursingEmrOrderHistoryItem) => void;
		}>();
</script>

{#if open}
	<WashDialog
		id="order-history-modal"
		open={true}
		{onClose}
		title=""
		showActions={false}
		boxClassName="h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none"
	>
		<LNursingEmrOrderHistoryTable
			{items}
			{isLoading}
			{pageSizeStr}
			{onDelete}
			embedded={true}
			fillParent={true}
			wrapperClass={TableEnum.HEIGHT_SMALL}
		/>
	</WashDialog>
{/if}
