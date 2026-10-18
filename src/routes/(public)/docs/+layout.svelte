<script lang="ts">
	import DocsShell from '$lib/component/own/global/public/docs/DocsShell.svelte';
	import '$lib/asset/style/docs-public.css';

	let { children, data } = $props();
</script>

<DocsShell modules={data.modules} searchItems={data.searchIndex}>
	{@render children()}
</DocsShell>
