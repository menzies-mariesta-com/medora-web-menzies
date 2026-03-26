<script lang="ts">
	let {
		children,
		className,
		optionHeader,
		onChange,
		value = $bindable(),
		disabled,
		id,
		name
	} = $props<{
		children?: () => void;
		onChange?: () => void;
		className?: string;
		optionHeader?: string;
		value?: any;
		disabled?: boolean;
		id?: string;
		name?: string;
	}>();
</script>

<select
	class="d-select {className}"
	bind:value
	{disabled}
	id={id}
	{name}
	onchange={onChange}
>
	{#if optionHeader != null && optionHeader !== ''}
		<option value="">{optionHeader}</option>
	{/if}
	{@render children?.()}
</select>
