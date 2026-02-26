<script lang="ts">
	let {
		children,
		className,
		optionHeader,
		onChange,
		value = $bindable(),
		disabled,
		name
	} = $props<{
		children?: () => void;
		onChange?: () => void;
		className?: string;
		optionHeader?: string;
		value?: any;
		disabled?: boolean;
		name?: string;
	}>();
</script>

<select
	class="d-select {className}"
	bind:value
	{disabled}
	{name}
	onchange={onChange}
>
	{#if optionHeader != null && optionHeader !== ''}
		<option value="">{optionHeader}</option>
	{/if}
	{@render children?.()}
</select>
