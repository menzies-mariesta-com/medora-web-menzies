<script lang="ts">
	/**
	 * Table row icon action — Menzies Design Data table pattern:
	 * `btn btn-ghost btn-square btn-{tone} btn-xs` + Lucide `size-3.5`.
	 * Tip is a real element anchored to the **right** (not DaisyUI `data-tip`,
	 * which defaults to top and still wins for some tones e.g. error).
	 * @see https://design-menzies.netlify.app/ — Components → Buttons / Templates → Data table
	 */
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { Snippet } from 'svelte';

	export type MenziesTableActionColor =
		| 'ghost'
		| 'primary'
		| 'secondary'
		| 'accent'
		| 'success'
		| 'warning'
		| 'error'
		| 'info';

	let {
		tooltipText,
		color = 'ghost',
		onClick,
		disabled = false,
		loading = false,
		loadingText = '',
		className = '',
		icon
	}: {
		tooltipText: string;
		color?: MenziesTableActionColor;
		onClick?: () => void;
		disabled?: boolean;
		loading?: boolean;
		loadingText?: string;
		className?: string;
		icon: Snippet;
	} = $props();

	/** Tone sits beside ghost (Design: `btn-ghost btn-square btn-secondary btn-xs`). */
	const toneClass = $derived(color === 'ghost' ? '' : `btn-${color}`);
	const tipTone = $derived(color === 'ghost' ? 'neutral' : color);
</script>

<div
	class="menzies-table-icon-action-tip"
	data-tone={tipTone}
>
	<WashButton
		variant="ghost"
		size="xs"
		square={true}
		className={`menzies-table-icon-action ${toneClass} ${className}`.trim()}
		{disabled}
		{loading}
		{loadingText}
		onClick={onClick}
	>
		<span class="menzies-table-icon-action__glyph" aria-hidden="true">
			{@render icon()}
		</span>
	</WashButton>
	<span class="menzies-table-icon-action-tip__label" role="tooltip">
		{tooltipText}
	</span>
</div>
