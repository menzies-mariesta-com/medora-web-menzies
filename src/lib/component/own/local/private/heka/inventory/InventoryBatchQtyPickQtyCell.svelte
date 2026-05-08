<script lang="ts">
	let {
		value = $bindable(''),
		onChange,
		disabled = false,
		ariaLabel
	}: {
		value: string;
		onChange?: (value: string) => void;
		disabled?: boolean;
		ariaLabel: string;
	} = $props();
</script>

<input
	type="number"
	class="d-input d-input-bordered d-input-sm w-full min-w-[6rem]"
	bind:value
	step="1"
	min="0"
	{disabled}
	autocomplete="off"
	aria-label={ariaLabel}
	oninput={(e) => onChange?.((e.currentTarget as HTMLInputElement).value)}
/>

