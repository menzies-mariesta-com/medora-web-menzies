<script lang="ts">
	import type { Snippet } from 'svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	/**
	 * Menzies Design Background: pigment page-wash (+ optional paper-grain).
	 * Prefer root `washShell` for app atmosphere; use this for framed surfaces only.
	 */
	let {
		children,
		className = '',
		grain = true
	}: {
		children?: Snippet;
		className?: string;
		/** Paper-fiber grain overlay. Defaults to true (Design demo). */
		grain?: boolean;
	} = $props();

	const recipe = $derived(
		grain ? washRecipes.pageWash : washRecipes.pageWashFlat
	);
</script>

<div class="{recipe} {className}">
	{@render children?.()}
</div>
