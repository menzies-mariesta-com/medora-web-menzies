<script lang="ts">
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	let {
		/** Prefer `washRecipes.table` (zebra + hover). Set false only for plain `table`. */
		useRecipe = true,
		effect,
		className = '',
		children
	} = $props<{
		useRecipe?: boolean;
		effect?: 'zebra';
		className?: string;
		children: () => void;
	}>();

	const classes = $derived.by(() => {
		const parts: string[] = [];
		if (useRecipe) {
			parts.push(washRecipes.table);
		} else {
			parts.push('table');
			if (effect) parts.push(`table-${effect}`);
		}
		if (className.trim()) parts.push(className.trim());
		return parts.join(' ');
	});
</script>

<table class={classes}>
	{@render children()}
</table>
