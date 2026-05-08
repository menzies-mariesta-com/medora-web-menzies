<script lang="ts">
	import InventoryLineItemsCard from '../InventoryLineItemsCard.svelte';
	import { m } from '$lib/paraglide/messages';

	type Props = {
		totalCount?: number;
		columns?: unknown[];
		rows?: unknown[];
		useColumnFilters?: boolean;
		/** Parent renders add line button elsewhere */
		hideAddButton?: boolean;
		/** No DaisyUiCard wrapper — table only */
		noCard?: boolean;
		onAddItem: () => void;
		onEditLine: (row: any) => void;
		onDeleteLine: (key: string) => void;
	};

	let {
		totalCount = 0,
		columns = [],
		rows = [],
		useColumnFilters = false,
		hideAddButton = false,
		noCard = false,
		onAddItem,
		onEditLine,
		onDeleteLine
	} = $props<Props>();
</script>

<InventoryLineItemsCard
	title={m.inv_po_lines()}
	hideTitle={true}
	addButtonIconOnly={true}
	{hideAddButton}
	{noCard}
	{totalCount}
	{columns}
	{rows}
	viewOnly={false}
	{useColumnFilters}
	{onAddItem}
	{onEditLine}
	{onDeleteLine}
/>
