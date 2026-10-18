<script lang="ts">
	import MenziesEcosystemPanel from '$lib/component/own/local/private/medora/MenziesEcosystemPanel.svelte';
	import { paraglideMsg } from '$lib/util/paraglide-fallback.util';
</script>

<svelte:head>
	<title
		>{paraglideMsg('ecosystem_page_title', 'Menzies ecosystem')} | Medora</title
	>
</svelte:head>

<main id="main" class="min-h-0 flex-1 p-1">
	<MenziesEcosystemPanel />
</main>
