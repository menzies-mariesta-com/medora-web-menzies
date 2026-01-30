<script lang="ts">
	let { children, className } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>


<div class="d-chat-footer opacity-50 {className}">
    {@render children()}
</div>