<script lang="ts">
	import DocsMermaid from './DocsMermaid.svelte';
	import { onMount } from 'svelte';

	let { html = '' } = $props<{ html?: string }>();

	let root = $state<HTMLDivElement | null>(null);
	let mermaidSources = $state<string[]>([]);

	onMount(() => {
		if (!root) return;
		const nodes = root.querySelectorAll('.docs-mermaid-src');
		const sources: string[] = [];
		nodes.forEach((n) => {
			const enc = n.getAttribute('data-mermaid');
			if (enc) sources.push(decodeURIComponent(enc));
			n.remove();
		});
		mermaidSources = sources;
	});
</script>

<article class="docs-article max-w-none">
	<div class="docs-html" bind:this={root}>{@html html}</div>
	{#each mermaidSources as src, i (i)}
		<DocsMermaid source={src} />
	{/each}
</article>
