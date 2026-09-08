<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
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

	const tooltipClass = $derived(`tooltip-${color}`);

	const buttonClass = $derived.by(() => {
		// Menzies Design Data table: btn-ghost btn-square btn-xs + tone
		const parts = ['btn-xs', 'btn-square', 'btn-ghost'];
		if (color !== 'ghost') {
			parts.push(`btn-${color}`);
		}
		if (className.trim()) {
			parts.push(className.trim());
		}
		return parts.join(' ');
	});
</script>

<WashTooltip {tooltipText} className={`tooltip-right ${tooltipClass}`}>
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
