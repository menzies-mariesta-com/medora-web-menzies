<script lang="ts">
	import { gsapAnimate } from '$lib/action/gsap.action.svelte';

	let { children, type = 'fadeUp' } = $props<{
		children: () => void;
		type?: 'fade' | 'fadeUp' | 'scale' | 'stagger';
	}>();
</script>

<div use:gsapAnimate={{ type }} class="animate-page-content">
	{@render children?.()}
</div>
