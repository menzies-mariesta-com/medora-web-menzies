<script lang="ts">
	let { className, onClose, children } = $props<{
		className?: string;
		onClose?: () => void;
		children: () => void;
	}>();
</script>

<div class="d-modal-box {className}">
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
	{@render children()}
</div>