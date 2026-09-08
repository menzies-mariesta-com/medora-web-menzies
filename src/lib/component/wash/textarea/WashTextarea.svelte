<script lang="ts">
	let {
		id,
		placeholder,
		className,
		value = $bindable()
	} = $props<{
		id?: string;
		placeholder?: string;
		className?: string;
		value?: string;
	}>();
</script>

<textarea {id} class="textarea {className}" {placeholder} bind:value
></textarea>
