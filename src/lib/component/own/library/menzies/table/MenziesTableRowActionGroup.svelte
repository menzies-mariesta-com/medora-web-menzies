<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="menzies-table-row-actions flex flex-nowrap items-center justify-start gap-1">
	{@render children()}
</div>
