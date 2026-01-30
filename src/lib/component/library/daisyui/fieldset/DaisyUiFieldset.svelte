<script lang="ts">
	let { children, className, fieldsetLegend } = $props<{
		children: () => void;
		className?: string;
		fieldsetLegend?: string;
	}>();
</script>

<fieldset class="d-fieldset {className}">
	<legend class="d-fieldset-legend">{fieldsetLegend}</legend>
	{@render children()}
</fieldset>
