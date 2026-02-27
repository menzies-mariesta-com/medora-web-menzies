<script lang="ts">
	import type { MarketplaceStoreInterface } from '$lib/model/interface/third-party-api/marketplace/marketplace-store.interface';
	import { getStore } from '$lib/remote/third-party-api/marketplace/store.remote';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';

	const lifeCycle = new LifeCycleUtil();

	let store = $state<MarketplaceStoreInterface[]>([]);
	lifeCycle.onMount(async () => {
		const response = await getStore();
		store = response ?? [];
	});
</script>

<div class="flex flex-col gap-4">
	<h1 class="text-2xl font-bold">{m.marketplace()}</h1>
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each store as item}
			<div class="card">
				<div class="card-body">
					<h2 class="card-title">{item.name}</h2>
				</div>
			</div>
		{/each}
	</div>
</div>