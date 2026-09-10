<script lang="ts">
	/**
	 * Svelte adapter for Menzies Design Wash Divider.
	 * @see https://design-menzies.netlify.app/ — Components → Divider
	 * Uses Wash/daisyUI `.divider` classes from menzies-design-wash-ui/styles.css.
	 *
	 * Orientation follows Design/daisyUI semantics:
	 * - `vertical` (default): line between stacked sections
	 * - `horizontal`: line between side-by-side items (`divider-horizontal`)
	 */
	import type { Snippet } from 'svelte';

	type DividerOrientation = 'vertical' | 'horizontal';
	type DividerColor =
		| 'default'
		| 'neutral'
		| 'primary'
		| 'secondary'
		| 'accent'
		| 'info'
		| 'success'
		| 'warning'
		| 'error';
	type DividerPosition = 'default' | 'start' | 'end';

	let {
		orientation = 'vertical',
		color = 'default',
		position = 'default',
		className = '',
		children
	}: {
		orientation?: DividerOrientation;
		color?: DividerColor;
		position?: DividerPosition;
		className?: string;
		children?: Snippet;
	} = $props();

	const colorClass: Record<DividerColor, string> = {
		default: '',
		neutral: 'divider-neutral',
		primary: 'divider-primary',
		secondary: 'divider-secondary',
		accent: 'divider-accent',
		info: 'divider-info',
		success: 'divider-success',
		warning: 'divider-warning',
		error: 'divider-error'
	};

	const orientationClass = $derived(
		orientation === 'horizontal' ? 'divider-horizontal' : 'divider-vertical'
	);

	const positionClass = $derived(
		position === 'start'
			? 'divider-start'
			: position === 'end'
				? 'divider-end'
				: ''
	);

	const resolvedClass = $derived(
		[
			'divider',
			orientationClass,
			colorClass[color],
			positionClass,
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class={resolvedClass} role="separator">
	{#if children}
		{@render children()}
	{/if}
</div>
