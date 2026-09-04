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
	let side = $state<HorizontalTooltipSide>('right');
	let isHovered = $state(false);

	const styleClass = $derived(stripTooltipPlacementClasses(className));

	/** Full class names (not `d-tooltip-${side}`) so Tailwind/daisyUI emit left/right CSS. */
	const effectiveSide = $derived(
		placement === 'auto' ? side : placement
	);

	function updateSide() {
		if (placement !== 'auto' || !rootEl) return;
		side = resolveHorizontalTooltipSide(rootEl);
	}

	function handlePointerEnter() {
		isHovered = true;
		updateSide();
	}

	function handlePointerLeave() {
		isHovered = false;
	}

	function handleFocusIn() {
		updateSide();
	}

	onMount(() => {
		const onResize = () => {
			if (isHovered) updateSide();
		};
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});
</script>

<!--
  Keep these class names as literal strings below — daisyUI only ships
  d-tooltip-left / d-tooltip-right when they appear statically in source.
-->
<div
	bind:this={rootEl}
	class="d-tooltip relative z-0 hover:z-50 focus-within:z-50 {styleClass}"
	class:d-tooltip-left={effectiveSide === 'left'}
	class:d-tooltip-right={effectiveSide === 'right'}
	data-tip={tooltipText}
	role="group"
	onmouseenter={handlePointerEnter}
	onmouseleave={handlePointerLeave}
	onfocusin={handleFocusIn}
>
	{@render children()}
</div>
