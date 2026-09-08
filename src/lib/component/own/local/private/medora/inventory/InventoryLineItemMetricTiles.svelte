<script lang="ts">
	import type { LineItemMetricTile } from '$lib/tool/inventory/line-item-metric-tiles.util';
	import { formatLineItemMetricTileValue } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	export let tiles: LineItemMetricTile[] | null;
	export let draftLine: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- page-local draft shapes
</script>

{#if tiles != null && tiles.length > 0}
	<div
		class="mt-2 grid grid-cols-2 gap-2 rounded-box border border-base-200 bg-base-200/30 p-3 text-sm sm:grid-cols-3"
	>
		{#each tiles as tile, tileIdx (tileIdx)}
			<div>
				<div class="text-xs opacity-70">{tile.label}</div>
				<div class="font-mono font-medium">
					{formatLineItemMetricTileValue(tile, draftLine)}
				</div>
			</div>
		{/each}
	</div>
{/if}
