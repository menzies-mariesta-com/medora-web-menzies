<script lang="ts">
	let {
		id,
		className = 'file-input file-input-bordered w-full',
		accept,
		multiple = false,
		disabled = false,
		inputEl = $bindable(undefined as HTMLInputElement | undefined),
		onchange
	} = $props<{
		id?: string;
		className?: string;
		accept?: string;
		multiple?: boolean;
		disabled?: boolean;
		inputEl?: HTMLInputElement | undefined;
		onchange?: (e: Event) => void;
	}>();
</script>

<input
	{id}
	type="file"
	class="{className} d-file-input"
	{accept}
	{multiple}
	{disabled}
	bind:this={inputEl}
	onchange={onchange}
/>
