<script lang="ts">
	let { children, className } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>


<div class="d-chat-header {className}">
    {@render children()}
</div>