<script lang="ts">
	let { placeholder, className } = $props<{
		placeholder?: string;
		className?: string;
	}>();
</script>

<textarea class="d-textarea {className}" {placeholder}></textarea>
