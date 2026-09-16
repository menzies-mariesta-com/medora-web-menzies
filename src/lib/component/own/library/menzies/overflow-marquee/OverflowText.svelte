<script lang="ts">
	/**
	 * In-place Design overflow marquee (same pattern as wash-ui `OverflowMarquee`).
	 * Prefer this inside dropdown rows / flex buttons — document portal marquee
	 * often fails there (Daisy `.menu` max-content + portal z-index / pointer churn).
	 * Hosts with `.overflow-marquee-host` are skipped by `attachOverflowMarquee`.
	 */
	import { isTextOverflowing } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { onMount } from 'svelte';

	let {
		text = '',
		className = '',
		title
	}: {
		text?: string;
		className?: string;
		title?: string;
	} = $props();

	let hostEl = $state<HTMLElement | null>(null);
	let labelEl = $state<HTMLElement | null>(null);
	let overflowing = $state(false);
	let active = $state(false);
	let duration = $state('10s');
	let reduced = $state(false);

	function durationFor(value: string, overflowPx: number): string {
		return `${Math.max(8, Math.min(28, value.length * 0.12 + overflowPx * 0.02)).toFixed(1)}s`;
	}

	function measure(): void {
		if (!labelEl) return;
		const next = isTextOverflowing(labelEl);
		overflowing = next;
		const normalized = text.replace(/\s+/g, ' ').trim();
		if (next && normalized) {
			duration = durationFor(
				normalized,
				Math.max(0, labelEl.scrollWidth - labelEl.clientWidth)
			);
		}
	}

	function onEnter(): void {
		measure();
		if (overflowing) active = true;
	}

	function onLeave(): void {
		active = false;
	}

	$effect(() => {
		void text;
		queueMicrotask(() => measure());
		if (!hostEl) return;
		const ro = new ResizeObserver(() => measure());
		ro.observe(hostEl);
		return () => ro.disconnect();
	});

	onMount(() => {
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	const labelText = $derived(text.replace(/\s+/g, ' ').trim());
	const showTrack = $derived(active && overflowing && !reduced && Boolean(labelText));
</script>

<!-- In-place hover marquee; pointer handlers only (safe inside <button>). -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
	bind:this={hostEl}
	role="presentation"
	class="overflow-marquee-host overflow-marquee min-w-0 {className}"
	data-overflow={overflowing ? 'true' : undefined}
	data-marquee-active={active && overflowing ? 'true' : undefined}
	data-marquee-static={active && overflowing && reduced ? 'true' : undefined}
	data-overflow-marquee=""
	title={active && overflowing && reduced ? labelText || title : title}
	style={showTrack ? `--overflow-marquee-duration: ${duration}` : undefined}
	onpointerenter={onEnter}
	onpointerleave={onLeave}
>
	<span bind:this={labelEl} class="overflow-marquee-label">{text}</span>
	{#if showTrack}
		<div class="overflow-marquee-track" aria-hidden="true">
			<span class="overflow-marquee-chunk">{labelText}</span>
			<span class="overflow-marquee-chunk">{labelText}</span>
		</div>
	{/if}
</span>
