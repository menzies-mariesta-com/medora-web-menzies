<script lang="ts">
	let { className } = $props<{
		className?: string;
	}>();
</script>

<div class="d-skeleton {className}"></div>
