<script lang="ts">
	let {
		value,
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
	class="d-input-bordered d-input d-input-sm w-full min-w-[6rem]"
	value={value == null || value === '' ? '' : String(value)}
	oninput={(e) =>
		onChange?.((e.currentTarget as HTMLInputElement).value)}
	step="1"
	min="0"
	{disabled}
	autocomplete="off"
	aria-label={ariaLabel}
/>
