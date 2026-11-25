<script lang="ts">
	import LVitalTrendChart from '$lib/component/own/local/private/medora/visit/LVitalTrendChart.svelte';
	import type { VitalTrendPoint } from '$lib/tool/vital/vital-trend.tool';

	type Row = { id: number; recordedAt: string | null; visitNo?: string | null };
	const pt = (i: number, value: number): VitalTrendPoint<Row> => ({
		at: Date.parse('2026-11-10T09:00:00Z') + i * 86_400_000,
		value,
		row: { id: i, recordedAt: null, visitNo: `V-${100 + i}` }
	});

	const single = [pt(0, 36.8)];
	const many = [36.6, 37.9, 36.9, 38.4, 37.2].map((v, i) => pt(i, v));
	const glucose = [96, 142, 118, 180, 104].map((v, i) => pt(i, v));
	const sys = [118, 142, 126, 150, 132].map((v, i) => pt(i, v));
	const dia = [78, 92, 82, 96, 86].map((v, i) => pt(i, v));
</script>

<div class="grid grid-cols-2 gap-6 bg-base-100 p-6">
	<div class="card border p-4">
		<LVitalTrendChart
			title="Temperature (one reading)"
			seriesA={single}
			yUnit="°C"
			includeZero={false}
			band={{ min: 36.2, max: 37.2 }}
			emptyMessage="none"
		/>
	</div>
	<div class="card border p-4">
		<LVitalTrendChart
			title="Temperature (trend)"
			seriesA={many}
			yUnit="°C"
			includeZero={false}
			band={{ min: 36.2, max: 37.2 }}
			emptyMessage="none"
		/>
	</div>
	<div class="card border p-4">
		<LVitalTrendChart
			title="Blood pressure"
			seriesA={sys}
			seriesB={dia}
			seriesALabel="Systolic"
			seriesBLabel="Diastolic"
			yUnit="mmHg"
			includeZero={false}
			band={{ min: 60, max: 120 }}
			emptyMessage="none"
		/>
	</div>
	<div class="card border p-4">
		<LVitalTrendChart
			title="Blood glucose"
			seriesA={glucose}
			yUnit="mg/dL"
			includeZero={false}
			band={{ min: 74, max: 140 }}
			emptyMessage="none"
		/>
	</div>
	<div class="card border p-4">
		<LVitalTrendChart
			title="Weight"
			seriesA={[pt(0, 72), pt(2, 71.4), pt(4, 70.8)]}
			yUnit="kg"
			includeZero={false}
			emptyMessage="none"
		/>
	</div>
</div>
