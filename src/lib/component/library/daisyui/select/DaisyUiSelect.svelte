<script lang="ts">
	let {
		children,
		className,
		optionHeader,
		value = $bindable()
	} = $props<{
		children?: () => void;
		className?: string;
		optionHeader?: string;
		value?: any;
	}>();
</script>

<select class="d-select {className}">
	<option disabled value="">{optionHeader}</option>
	{@render children?.()}
</select>
