<script lang="ts">
	let { className, onClick, children } = $props<{
		className?: string;

		onClick: () => void;
		children?: () => void;
	}>();
</script>

<button class="d-btn {className}" onclick={onClick}>
	{@render children?.()}
</button>
