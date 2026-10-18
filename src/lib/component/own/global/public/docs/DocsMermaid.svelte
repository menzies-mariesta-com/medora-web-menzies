<script lang="ts">
	let { source = '' } = $props<{ source?: string }>();
</script>

<pre
	class="docs-mermaid-fallback my-4 overflow-x-auto rounded-box border border-base-300 bg-base-200/50 p-3 text-xs leading-relaxed"
	aria-label="Workflow diagram"
>{source}</pre>
