<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- forwards to shared card with page-typed rows */
	import InventoryLineItemsCard from '../InventoryLineItemsCard.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	type Props = {
		totalCount: number;
		columns: unknown[];
		rows: unknown[];
		useColumnFilters?: boolean;
		hideQuickFilter?: boolean;
		hideAddButton?: boolean;
		toolbarRight?: Snippet<[]>;
		onAddItem: () => void;
		onEditLine: (row: any) => void;
		onDeleteLine: (key: string) => void;
	};

	let {
		totalCount,
		columns,
		rows,
		useColumnFilters = false,
		hideQuickFilter = false,
		hideAddButton = false,
		toolbarRight,
		onAddItem,
		onEditLine,
		onDeleteLine
	}: Props = $props();
</script>

<InventoryLineItemsCard
	title={m.inv_po_lines()}
	{totalCount}
	{columns}
	{rows}
	{useColumnFilters}
	{hideQuickFilter}
	{hideAddButton}
	{toolbarRight}
	viewOnly={false}
	{onAddItem}
	{onEditLine}
	{onDeleteLine}
/>
