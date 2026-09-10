<script lang="ts">
	import {
		resolveHorizontalTooltipSide,
		stripTooltipPlacementClasses,
		type HorizontalTooltipSide
	} from '$lib/util/tooltip-placement.util.svelte';
	import { onMount } from 'svelte';

	let {
		children,
		tooltipText,
		className = '',
		placement = 'auto'
	} = $props<{
		children: () => void;
		tooltipText: string;
		className?: string;
		placement?: 'auto' | HorizontalTooltipSide;
	}>();

	let rootEl = $state<HTMLDivElement | null>(null);
	/** Near left of screen → 'right'; near right → 'left'. Never top/bottom. */
	let side = $state<HorizontalTooltipSide>('right');

	const styleClass = $derived(stripTooltipPlacementClasses(className));

	const effectiveSide = $derived(
		placement === 'auto' ? side : placement
	);

	/** Literal class string so DaisyUI left/right rules always match (not only class:). */
	const sideClass = $derived(
		effectiveSide === 'left' ? 'tooltip-left' : 'tooltip-right'
	);

	function updateSide() {
		if (placement !== 'auto' || !rootEl) return;
		side = resolveHorizontalTooltipSide(rootEl);
	}

	function handlePointerEnter() {
		updateSide();
	}

	function handleFocusIn() {
		updateSide();
	}

	$effect(() => {
		if (rootEl) updateSide();
	});

	onMount(() => {
		updateSide();
		const onResize = () => updateSide();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});
</script>

<!--
  Always emit a static horizontal side class (tooltip-left | tooltip-right).
  DaisyUI defaults bare `.tooltip` to top; without a side class tips sit above.
-->
<div
	bind:this={rootEl}
	class="tooltip relative z-0 hover:z-[100] focus-within:z-[100] {sideClass} {styleClass}"
	class:tooltip-left={effectiveSide === 'left'}
	class:tooltip-right={effectiveSide === 'right'}
	data-tip={tooltipText}
	data-tooltip-side={effectiveSide}
	role="group"
	onmouseenter={handlePointerEnter}
	onfocusin={handleFocusIn}
>
	{@render children()}
</div>
