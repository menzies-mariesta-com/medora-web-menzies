<script lang="ts">
	let {
		src,
		alt,
		shape = 'rounded-full', // "rounded-full", "rounded-xl", or any custom class
		size = 'w-12', // tailwind size class
		placeholder,
		className
	} = $props<{
		src?: string;
		alt?: string;
		shape?: string;
		size?: string;
		placeholder?: string | number; // e.g., "+99"
		className?: string;
	}>();
</script>

{#if src}
	<div class="d-avatar {className}">
		<div class="{size} {shape}">
			<img {src} {alt} />
		</div>
	</div>
{:else if placeholder}
	<div class="d-avatar d-avatar-placeholder {className}">
		<div
			class="{size} {shape} flex items-center justify-center bg-neutral text-neutral-content"
		>
			<span>{placeholder}</span>
		</div>
	</div>
{/if}
