<script lang="ts">
	let { children, className, optionHeader, value = $bindable(), onChange } = $props<{
		children?: () => void;
		className?: string;
		optionHeader?: string;
		value?: any;
		onChange?: (e: Event) => void;
	}>();
</script>

<select class="d-select {className}" bind:value onchange={onChange}>
	<option disabled value="">{optionHeader}</option>
	{@render children?.()}
</select>
