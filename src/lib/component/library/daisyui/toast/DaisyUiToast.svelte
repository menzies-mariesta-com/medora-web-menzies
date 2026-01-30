<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-toast-center d-toast {className}">
	{@render children()}
</div>
