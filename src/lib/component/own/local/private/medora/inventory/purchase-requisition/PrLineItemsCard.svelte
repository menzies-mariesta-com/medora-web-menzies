<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- forwards to shared card with page-typed rows */
	import InventoryLineItemsCard from '../InventoryLineItemsCard.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	export let viewOnly = false;
	export let lineItemFilter = '';
	export let createLinesCount = 0;
	export let columns: unknown[] = [];
	export let rows: unknown[] = [];
	export let useColumnFilters = false;
	export let hideQuickFilter = false;
	export let hideAddButton = false;
	export let addButtonIconOnly = false;
	export let toolbarRight: Snippet<[]> | undefined = undefined;

	export let onAddItem: () => void;
	export let onEditLine: (row: any) => void;
	export let onDeleteLine: (key: string) => void;

	export let showCloseLine = false;
	export let isCloseableFn: ((row: any) => boolean) | null = null;
	export let onCloseLine: ((row: any) => void) | null = null;
</script>

<InventoryLineItemsCard
	title={m.inv_line_items_section_title()}
	bind:lineItemFilter
	{useColumnFilters}
	{hideQuickFilter}
	{hideAddButton}
	{addButtonIconOnly}
	{toolbarRight}
	totalCount={createLinesCount}
	{columns}
	{rows}
	{viewOnly}
	{showCloseLine}
	{isCloseableFn}
	{onCloseLine}
	{onAddItem}
	{onEditLine}
	{onDeleteLine}
/>
