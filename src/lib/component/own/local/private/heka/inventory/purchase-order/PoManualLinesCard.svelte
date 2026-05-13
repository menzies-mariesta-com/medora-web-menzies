<script lang="ts">
	import InventoryLineItemsCard from '../InventoryLineItemsCard.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	type Props = {
		totalCount?: number;
		columns?: unknown[];
		rows?: unknown[];
		useColumnFilters?: boolean;
		hideQuickFilter?: boolean;
		/** Parent renders add line button elsewhere */
		hideAddButton?: boolean;
		/** No DaisyUiCard wrapper — table only */
		noCard?: boolean;
		toolbarRight?: Snippet<[]>;
		onAddItem: () => void;
		onEditLine: (row: any) => void;
		onDeleteLine: (key: string) => void;
	};

	let {
		totalCount = 0,
		columns = [],
		rows = [],
		useColumnFilters = false,
		hideQuickFilter = false,
		hideAddButton = false,
		noCard = false,
		toolbarRight,
		onAddItem,
		onEditLine,
		onDeleteLine
	}: Props = $props();
</script>

<InventoryLineItemsCard
	title={m.inv_po_lines()}
	hideTitle={true}
	addButtonIconOnly={true}
	{hideAddButton}
	{noCard}
	{hideQuickFilter}
	{toolbarRight}
	{totalCount}
	{columns}
	{rows}
	viewOnly={false}
	{useColumnFilters}
	{onAddItem}
	{onEditLine}
	{onDeleteLine}
/>
