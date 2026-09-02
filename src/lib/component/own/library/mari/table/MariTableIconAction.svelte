<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import type { Snippet } from 'svelte';

	export type MariTableActionColor =
		| 'ghost'
		| 'primary'
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
		color?: MariTableActionColor;
		onClick?: () => void;
		disabled?: boolean;
		loading?: boolean;
		loadingText?: string;
		className?: string;
		icon: Snippet;
	} = $props();

	const tooltipClass = $derived(
		`d-tooltip-${color} d-tooltip-top`.trim()
	);

	const buttonClass = $derived.by(() => {
		const parts = ['d-btn-sm', 'd-btn-square', 'd-btn-ghost'];
		if (color !== 'ghost') {
			parts.push(`d-btn-${color}`);
		}
		if (className.trim()) {
			parts.push(className.trim());
		}
		return parts.join(' ');
	});
</script>

<DaisyUiTooltip {tooltipText} className={tooltipClass}>
	<DaisyUiButton
		className={buttonClass}
		{disabled}
		{loading}
		{loadingText}
		onClick={onClick}
	>
		{@render icon()}
	</DaisyUiButton>
</DaisyUiTooltip>
