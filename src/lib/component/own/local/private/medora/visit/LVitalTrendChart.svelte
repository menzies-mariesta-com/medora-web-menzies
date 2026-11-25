<script lang="ts">
	import { D3Util, type LineChartOptions } from '$lib/util/d3.util';
	import { m } from '$lib/paraglide/messages';
	import type {
		VitalTrendPoint,
		VitalTrendSourceRow
	} from '$lib/tool/vital/vital-trend.tool';

	type Row = VitalTrendSourceRow;
	type Point = VitalTrendPoint<Row>;

	let {
		title,
		seriesA,
		seriesB,
		seriesALabel,
		seriesBLabel,
		yUnit = '',
		includeZero = true,
		band,
		emptyMessage
	} = $props<{
		title: string;
		seriesA: Point[];
		seriesB?: Point[];
		seriesALabel?: string;
		seriesBLabel?: string;
		yUnit?: string;
		includeZero?: boolean;
		/** Normal reference range, shaded behind the data. */
		band?: { min: number; max: number };
		emptyMessage: string;
	}>();

	const SERIES_A_COLOR = 'var(--color-primary, #570df8)';
	const SERIES_B_COLOR = 'var(--color-error, #f87272)';
	const BAND_COLOR = 'var(--color-success, #36d399)';

	let container = $state<HTMLDivElement | null>(null);

	const hasData = $derived(seriesA.length > 0 || (seriesB?.length ?? 0) > 0);
	const drawKey = $derived(
		JSON.stringify({
			a: seriesA.map((p) => [p.at, p.value]),
			b: (seriesB ?? []).map((p) => [p.at, p.value]),
			zero: includeZero,
			unit: yUnit,
			band
		})
	);

	function tooltipFor(d: Point): string {
		const value = yUnit ? `${d.value} ${yUnit}` : `${d.value}`;
		return [new Date(d.at).toLocaleString(), value, d.row.visitNo ?? '']
			.filter(Boolean)
			.join(' · ');
	}

	$effect(() => {
		// Read the draw key so new data (not just a resize) re-runs the chart.
		const key = drawKey;
		let host = container;
		if (!host || !key) return;

		let cancelled = false;
		let retries = 0;
		const draw = () => {
			host = container;
			if (cancelled || !host) return;
			const width = host.clientWidth;
			const height = host.clientHeight || 240;
			if (width <= 0 && retries++ < 20) {
				setTimeout(draw, 50);
				return;
			}
			if (!hasData) return;

			const options: LineChartOptions<Point> = {
				container: host,
				// The x axis spans both series; extra series draw their own points.
				data: seriesA.length > 0 ? seriesA : (seriesB ?? []),
				width,
				height,
				xAccessor: (d) => new Date(d.at),
				yAccessor: (d) => d.value,
				xScaleType: 'time',
				includeZero,
				band,
				showArea: true,
				theme: { lineColor: SERIES_A_COLOR },
				tooltipFormatter: tooltipFor,
				series:
					seriesB && seriesB.length > 0
						? [
								{
									data: seriesB,
									yAccessor: (d: Point) => d.value,
									color: SERIES_B_COLOR,
									label: seriesBLabel
								}
							]
						: []
			};
			D3Util.createLineChart(options);
		};
		requestAnimationFrame(draw);
		return () => {
			cancelled = true;
		};
	});

	const legend = $derived(
		[
			seriesALabel && seriesA.length > 0
				? { label: seriesALabel, color: SERIES_A_COLOR }
				: null,
			seriesBLabel && (seriesB?.length ?? 0) > 0
				? { label: seriesBLabel, color: SERIES_B_COLOR }
				: null
		].filter((x): x is { label: string; color: string } => x != null)
	);
</script>

<figure class="m-0 flex min-w-0 flex-col gap-2">
	<figcaption class="flex flex-wrap items-center justify-between gap-2">
		<span class="flex flex-wrap items-center gap-2">
			<span class="text-sm font-semibold">{title}</span>
			{#if yUnit}
				<span class="badge badge-sm badge-ghost border-base-300 font-normal">
					{m.visit_visual_chart_unit({ unit: yUnit })}
				</span>
			{/if}
			{#if band}
				<span class="badge badge-sm badge-ghost gap-1 border-base-300 font-normal">
					<span
						class="inline-block h-2 w-2 rounded-sm"
						style:background-color={BAND_COLOR}
						aria-hidden="true"
					></span>
					{m.visit_visual_ref_range({
						min: `${band.min}`,
						max: `${band.max}`
					})}
				</span>
			{/if}
		</span>
		{#if legend.length > 1}
			<span class="flex flex-wrap items-center gap-3 text-xs">
				{#each legend as item (item.label)}
					<span class="flex items-center gap-1">
						<span
							class="inline-block h-2 w-2 rounded-full"
							style:background-color={item.color}
							aria-hidden="true"
						></span>
						{item.label}
					</span>
				{/each}
			</span>
		{/if}
	</figcaption>
	{#if hasData}
		<div class="min-h-[240px] w-full min-w-0" bind:this={container}></div>
	{:else}
		<p class="text-sm text-base-content/60">{emptyMessage}</p>
	{/if}
</figure>
