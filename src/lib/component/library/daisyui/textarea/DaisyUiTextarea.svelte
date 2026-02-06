<script lang="ts">
	let { placeholder, className, value = $bindable() } = $props<{
		placeholder?: string;
		className?: string;
		value?: string;
	}>();
</script>

<textarea class="d-textarea {className}" {placeholder} bind:value></textarea>
