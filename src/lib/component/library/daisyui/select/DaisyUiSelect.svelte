<script lang="ts">
	let {
		children,
		className,
		optionHeader,
		value = $bindable(),
		disabled
	} = $props<{
		children?: () => void;
		className?: string;
		optionHeader?: string;
		value?: any;
		disabled?: boolean;
	}>();
</script>

<select class="d-select {className}" bind:value {disabled}>
	<option disabled value="">{optionHeader}</option>
	{@render children?.()}
</select>
