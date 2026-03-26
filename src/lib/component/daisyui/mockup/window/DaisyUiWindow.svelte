<script lang="ts">
	let { className, contentClassName, children } = $props<{
		className?: string;
		contentClassName?: string;
		children?: () => void;
	}>();
</script>

<div class="d-mockup-window {className}">
	<div class={contentClassName}>
		{@render children()}
	</div>
</div>
