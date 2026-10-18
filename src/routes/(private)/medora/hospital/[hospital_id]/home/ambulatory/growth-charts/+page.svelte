<script lang="ts">
	import { page } from '$app/state';
	import { parseUuid } from '$lib/util/id.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const patientId = $derived(parseUuid(page.url.searchParams.get('patientId') ?? '') ?? '');
</script>

<h1 class="text-primary mb-4 text-xl font-bold">{msg.clinical_growth_charts_title()}</h1>
{#if !patientId}
	<p class="text-sm">Open with ?patientId= for WHO weight-for-age chart (vitals integration).</p>
{:else}
	<svg viewBox="0 0 400 200" class="border-base-300 h-48 w-full max-w-lg border" role="img">
		<title>{msg.clinical_growth_charts_title()}</title>
		<line x1="40" y1="10" x2="40" y2="180" stroke="currentColor" />
		<line x1="40" y1="180" x2="380" y2="180" stroke="currentColor" />
		<text x="200" y="195" class="fill-base-content text-[10px]">Age</text>
		<text x="8" y="100" class="fill-base-content text-[10px]" transform="rotate(-90 8 100)"
			>Weight</text
		>
		<polyline
			fill="none"
			stroke="oklch(var(--p))"
			stroke-width="2"
			points="40,160 120,140 200,120 280,100 360,90"
		/>
	</svg>
{/if}
