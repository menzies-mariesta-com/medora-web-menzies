<script lang="ts">
	import { gsapAnimate } from '$lib/action/gsap.action.svelte';

	let {
		children,
		className,
		animate = false
	} = $props<{
		children: () => void;
		className?: string;
		/** When true, card fades in smoothly on mount */
		animate?: boolean;
	}>();
</script>

<div
	class="d-card bg-base-200 shadow-md {className}"
	use:gsapAnimate={animate
		? { type: 'fadeUp', duration: 0.3, enabled: true }
		: false}
>
	{@render children()}
</div>
