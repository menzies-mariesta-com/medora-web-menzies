<script lang="ts">
	let {
		className,
		onClose,
		children,
		showCloseButton = true
	} = $props<{
		className?: string;
		onClose?: () => void;
		children: () => void;
		/** When false, the built-in close (✕) is hidden; use when content has its own close. */
		showCloseButton?: boolean;
	}>();
</script>

<div class="modal-box {className}">
	{#if showCloseButton}
		<div>
			<button
				type="button"
				class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
				onclick={() => onClose?.()}
				aria-label="Close"
			>
				✕
			</button>
		</div>
	{/if}
	{@render children()}
</div>
