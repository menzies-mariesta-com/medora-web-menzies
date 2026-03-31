<script lang="ts">
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import { onMount } from 'svelte';

	let {
		className,
		type,
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

	let btnEl: HTMLButtonElement | null = null;
	let resolvedType = $state<'button' | 'submit' | 'reset'>('button');

	$effect(() => {
		// If caller provided an explicit type, always respect it.
		if (type) resolvedType = type;
	});

	onMount(() => {
		// If no explicit type was provided, infer submit behavior
		// when used inside a native <form>.
		if (type) return;
		const closestForm = btnEl?.closest('form');
		resolvedType = closestForm ? 'submit' : 'button';
	});
</script>

<button
	class="d-btn {className}"
	bind:this={btnEl}
	type={resolvedType}
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
