<script lang="ts">
	let {
		id,
		placeholder,
		className,
		value = $bindable(),
		disabled = false,
		oninput
	} = $props<{
		id?: string;
		placeholder?: string;
		className?: string;
		value?: string;
		disabled?: boolean;
		oninput?: (event: Event) => void;
	}>();
</script>

<textarea
	{id}
	{disabled}
	class="textarea {className}"
	{placeholder}
	bind:value
	{oninput}
></textarea>
