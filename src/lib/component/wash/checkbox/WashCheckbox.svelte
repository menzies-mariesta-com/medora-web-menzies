<script lang="ts">
	let {
		className,
		id,
		checked = $bindable(),
		disabled = false,
		onCheckedChange
	} = $props<{
		className?: string;
		id?: string;
		checked?: boolean;
		disabled?: boolean;
		/** Fires after the checkbox value changes (typically user input). */
		onCheckedChange?: () => void;
	}>();
</script>

<input
	{id}
	type="checkbox"
	bind:checked
	{disabled}
	class="checkbox {className}"
	onchange={() => onCheckedChange?.()}
/>
