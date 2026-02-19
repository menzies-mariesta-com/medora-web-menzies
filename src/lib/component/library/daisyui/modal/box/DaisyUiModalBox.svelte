<script lang="ts">
	let { className, onClose, children, showCloseButton = true } = $props<{
		className?: string;
		onClose?: () => void;
		children: () => void;
		/** When false, the built-in close (✕) is hidden; use when content has its own close. */
		showCloseButton?: boolean;
	}>();
</script>

<div class="d-modal-box {className}">
	{#if showCloseButton}
		<div>
			<button
				type="button"
				class="d-btn d-btn-sm d-btn-circle d-btn-ghost absolute right-2 top-2"
				onclick={() => onClose?.()}
				aria-label="Close"
			>
				✕
			</button>
		</div>
	{/if}
	{@render children()}
</div>