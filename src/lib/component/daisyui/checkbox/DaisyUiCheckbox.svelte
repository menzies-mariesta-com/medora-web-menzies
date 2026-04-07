<script lang="ts">
	let {
		className,
		id,
		checked = $bindable(),
		onCheckedChange
	} = $props<{
		className?: string;
		id?: string;
		checked?: boolean;
		/** Fires after the checkbox value changes (typically user input). */
		onCheckedChange?: () => void;
	}>();
</script>

<input
	{id}
	type="checkbox"
	bind:checked
	class="d-checkbox {className}"
	onchange={() => onCheckedChange?.()}
/>
