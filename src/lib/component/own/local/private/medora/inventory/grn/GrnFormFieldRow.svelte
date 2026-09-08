<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		alignStart = false,
		children
	}: {
		label: string;
		alignStart?: boolean;
		children: Snippet;
	} = $props();
</script>

<div
	class="flex min-w-0 flex-col gap-1 sm:flex-row sm:gap-3 {alignStart
		? 'sm:items-start'
		: 'sm:items-center'}"
>
	<label class="shrink-0 sm:w-40 {alignStart ? 'sm:pt-2' : ''}">
		{label}
	</label>
	<div class="min-w-0 flex-1">
		{@render children()}
	</div>
</div>
