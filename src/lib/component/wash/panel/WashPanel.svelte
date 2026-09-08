<script lang="ts">
	import type { Snippet } from 'svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	/**
	 * Menzies Design leaf wash-panel surface (paper grain + panel wash).
	 * Do not nest under private EMR layouts as a second page-wash.
	 */
	let {
		children,
		className = '',
		flush = false
	}: {
		children?: Snippet;
		className?: string;
		/** Use washPanelFlush (edge-to-edge panel). */
		flush?: boolean;
	} = $props();

	const recipe = $derived(
		flush ? washRecipes.washPanelFlush : washRecipes.washPanel
	);
</script>

<div class="{recipe} {className}">
	{@render children?.()}
</div>
