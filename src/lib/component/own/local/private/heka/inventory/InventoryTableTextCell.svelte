<script lang="ts">
	let {
		value,
		onValueChange,
		disabled = false,
		className = 'd-input d-input-bordered w-full',
		inputType = 'text'
	} = $props<{
		value: string;
		onValueChange: (v: string) => void;
		disabled?: boolean;
		className?: string;
		inputType?: string;
	}>();
</script>

<input
	type={inputType}
	class={className}
	{value}
	{disabled}
	oninput={(e) => onValueChange((e.currentTarget as HTMLInputElement).value)}
/>
