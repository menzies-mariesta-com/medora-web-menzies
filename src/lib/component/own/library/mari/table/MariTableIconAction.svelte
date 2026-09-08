<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
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

	const tooltipClass = $derived(`tooltip-${color}`);

	const buttonClass = $derived.by(() => {
		const parts = ['btn-sm', 'btn-square', 'btn-ghost'];
		if (color !== 'ghost') {
			parts.push(`btn-${color}`);
		}
		if (className.trim()) {
			parts.push(className.trim());
		}
		return parts.join(' ');
	});
</script>

<WashTooltip {tooltipText} className={tooltipClass}>
	<WashButton
		className={buttonClass}
		{disabled}
		{loading}
		{loadingText}
		onClick={onClick}
	>
		{@render icon()}
	</WashButton>
</WashTooltip>
