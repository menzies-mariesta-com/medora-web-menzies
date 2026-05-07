<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- forwards to shared card with page-typed rows */
	import InventoryLineItemsCard from '../InventoryLineItemsCard.svelte';
	import { m } from '$lib/paraglide/messages';

	export let directLineItemFilter = '';
	export let totalCount = 0;
	export let columns: unknown[] = [];
	export let rows: unknown[] = [];

	export let onAddItem: () => void;
	export let onEditLine: (row: any) => void;
	export let onDeleteLine: (key: string) => void;
</script>

<InventoryLineItemsCard
	title={m.inv_po_lines()}
	bind:lineItemFilter={directLineItemFilter}
	{totalCount}
	{columns}
	{rows}
	viewOnly={false}
	{onAddItem}
	{onEditLine}
	{onDeleteLine}
/>
