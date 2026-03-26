<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-toast d-toast-center {className}">
	{@render children()}
</div>
