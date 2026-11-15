<script lang="ts">
	import DocsMermaid from './DocsMermaid.svelte';
	import { onMount } from 'svelte';

	let {
		html = '',
		embedded = false
	} = $props<{
		html?: string;
		/** When true, output lives inside a parent `.docs-prose` article (template shell). */
		embedded?: boolean;
	}>();

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

{#if embedded}
	<div class="docs-html max-w-none" bind:this={root}>{@html html}</div>
{:else}
	<article class="docs-prose docs-article max-w-none">
		<div class="docs-html" bind:this={root}>{@html html}</div>
	</article>
{/if}
{#each mermaidSources as src, i (i)}
	<DocsMermaid source={src} />
{/each}
