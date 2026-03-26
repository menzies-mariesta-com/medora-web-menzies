<script lang="ts">
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';

	let {
		className,
		type = 'button',
		onClick,
		disabled,
		loading = false,
		loadingText = 'Loading…',
		spinner = true,
		children
	} = $props<{
		className?: string;
		type?: 'button' | 'submit' | 'reset';
		onClick?: () => void;
		disabled?: boolean;
		loading?: boolean;
		loadingText?: string;
		spinner?: boolean;
		children?: () => void;
	}>();

	const isDisabled = $derived(Boolean(disabled || loading));
</script>

<button
	class="d-btn {className}"
	{type}
	onclick={onClick}
	disabled={isDisabled}
	aria-busy={loading}
>
	{#if loading}
		<span class="inline-flex items-center gap-2">
			{#if spinner}
				<span aria-hidden="true">
					<DaisyUiLoading className="d-loading-sm" />
				</span>
			{/if}
			<span>{loadingText}</span>
		</span>
	{:else}
		{@render children?.()}
	{/if}
</button>
