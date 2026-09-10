<script lang="ts">
	/**
	 * Svelte adapter for Menzies Design Wash Button.
	 * @see https://design-menzies.netlify.app/ — Components → Buttons
	 * Mirrors `@menzies-mariesta-com/menzies-design-wash-ui` React Button
	 * (variant, size, ripple, loading) using Wash CSS classes.
	 */
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { onMount } from 'svelte';

	type ButtonVariant =
		| 'default'
		| 'primary'
		| 'secondary'
		| 'accent'
		| 'neutral'
		| 'info'
		| 'success'
		| 'warning'
		| 'error'
		| 'ghost'
		| 'link';

	type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

	const variantClass: Record<ButtonVariant, string> = {
		default: '',
		primary: 'btn-primary',
		secondary: 'btn-secondary',
		accent: 'btn-accent',
		neutral: 'btn-neutral',
		info: 'btn-info',
		success: 'btn-success',
		warning: 'btn-warning',
		error: 'btn-error',
		ghost: 'btn-ghost',
		link: 'btn-link'
	};

	const sizeClass: Record<ButtonSize, string> = {
		xs: 'btn-xs',
		sm: 'btn-sm',
		md: '',
		lg: 'btn-lg',
		xl: 'btn-xl'
	};

	let {
		className = '',
		variant = 'default',
		size = 'md',
		type,
		onClick,
		disabled,
		loading = false,
		loadingText = 'Loading…',
		spinner = true,
		ripple = true,
		wide = false,
		block = false,
		square = false,
		circle = false,
		soft = false,
		dash = false,
		title,
		children
	} = $props<{
		className?: string;
		variant?: ButtonVariant;
		size?: ButtonSize;
		type?: 'button' | 'submit' | 'reset';
		onClick?: () => void;
		disabled?: boolean;
		loading?: boolean;
		loadingText?: string;
		spinner?: boolean;
		ripple?: boolean;
		wide?: boolean;
		block?: boolean;
		square?: boolean;
		circle?: boolean;
		soft?: boolean;
		dash?: boolean;
		title?: string;
		children?: () => void;
	}>();

	const isDisabled = $derived(Boolean(disabled || loading));

	let btnEl: HTMLButtonElement | null = null;
	let resolvedType = $state<'button' | 'submit' | 'reset'>('button');

	$effect(() => {
		if (type) resolvedType = type;
	});

	onMount(() => {
		if (type) return;
		const closestForm = btnEl?.closest('form');
		resolvedType = closestForm ? 'submit' : 'button';
	});

	const classes = $derived(
		[
			ripple ? washRecipes.btnRipple : 'btn cursor-pointer',
			variantClass[variant],
			sizeClass[size],
			soft ? 'btn-soft' : '',
			dash ? 'btn-dash' : '',
			wide ? 'btn-wide' : '',
			block ? 'btn-block' : '',
			square ? 'btn-square' : '',
			circle ? 'btn-circle' : '',
			'disabled:cursor-not-allowed disabled:opacity-40',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<button
	class={classes}
	bind:this={btnEl}
	type={resolvedType}
	onclick={onClick}
	disabled={isDisabled}
	aria-busy={loading || undefined}
	{title}
>
	{#if loading}
		<span class="inline-flex items-center gap-2">
			{#if spinner}
				<span aria-hidden="true">
					<span
						class="loading loading-spinner {size === 'xs'
							? 'loading-xs'
							: 'loading-sm'}"
					></span>
				</span>
			{/if}
			{#if loadingText}
				<span>{loadingText}</span>
			{/if}
		</span>
	{:else}
		{@render children?.()}
	{/if}
</button>
