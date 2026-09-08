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
	/** Near left of screen → 'right'; near right → 'left'. */
	let side = $state<HorizontalTooltipSide>('right');

	const styleClass = $derived(stripTooltipPlacementClasses(className));

	/** Full class names (not `tooltip-${side}`) so Tailwind/daisyUI emit left/right CSS. */
	const effectiveSide = $derived(
		placement === 'auto' ? side : placement
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

	// Resolve as soon as the node is bound (left-edge → right tip, right-edge → left tip).
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
  Keep these class names as literal strings below — daisyUI only ships
  tooltip-left / tooltip-right when they appear statically in source.
-->
<div
	bind:this={rootEl}
	class="tooltip relative z-0 hover:z-50 focus-within:z-50 {styleClass}"
	class:tooltip-left={effectiveSide === 'left'}
	class:tooltip-right={effectiveSide === 'right'}
	data-tip={tooltipText}
	role="group"
	onmouseenter={handlePointerEnter}
	onfocusin={handleFocusIn}
>
	{@render children()}
</div>
