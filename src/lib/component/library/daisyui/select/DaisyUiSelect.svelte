<script lang="ts">
	let {
		children,
		className,
		optionHeader,
		onChange,
		value = $bindable(),
		disabled
	} = $props<{
		children?: () => void;
		onChange?: () => void;
		className?: string;
		optionHeader?: string;
		value?: any;
		disabled?: boolean;
	}>();
</script>

<select
	class="d-select {className}"
	bind:value
	{disabled}
	onchange={onChange}
>
	{#if optionHeader != null && optionHeader !== ''}
		<option value="">{optionHeader}</option>
	{/if}
	{@render children?.()}
</select>
